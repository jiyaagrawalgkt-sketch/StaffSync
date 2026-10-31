import Leave, { LEAVE_TYPES } from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { toWorkDate, addDays, countWorkdays, daysBetween } from '../utils/dates.js';
import { notifyUsers, activeHrIds } from './notification.service.js';
import { visibleUserIds, resolveUserFilter, assertCanAccessUser } from './scope.js';

const currentYear = () => Number(toWorkDate().slice(0, 4));

// Creates the yearly balance rows (casual/sick/earned) if they do not exist yet.
export async function ensureBalances(userId, year = currentYear()) {
  await Promise.all(
    LEAVE_TYPES.map((type) =>
      LeaveBalance.updateOne({ user: userId, year, type }, { $setOnInsert: { allocated: env.leaveAllocations[type], used: 0 } }, { upsert: true })
        .catch((e) => { if (e.code !== 11000) throw e; }) // a parallel request created it first: fine
    )
  );
}

export async function getBalances(actor, requestedUser, year = currentYear()) {
  const target = requestedUser || actor._id;
  await assertCanAccessUser(actor, target);
  await ensureBalances(target, year);
  const rows = await LeaveBalance.find({ user: target, year }).lean();
  return LEAVE_TYPES.map((type) => {
    const r = rows.find((x) => x.type === type);
    return { _id: r._id, type, year, allocated: r.allocated, used: r.used, remaining: r.allocated - r.used };
  });
}

export async function adjustBalance({ user, year, type, allocated }) {
  if (!(await User.exists({ _id: user }))) throw new AppError('Employee not found', 404);
  await ensureBalances(user, year);
  const row = await LeaveBalance.findOne({ user, year, type });
  if (allocated < row.used) throw new AppError(`Allocation cannot be lower than days already used (${row.used})`, 400);
  row.allocated = allocated;
  await row.save();
  return row;
}

async function approversFor(requester) {
  if (requester.role === 'employee' && requester.manager) return [requester.manager];
  return activeHrIds(requester._id);
}

export async function applyLeave(user, data) {
  const today = toWorkDate();
  const { type, startDate, endDate, reason } = data;

  if (startDate.slice(0, 4) !== endDate.slice(0, 4)) throw new AppError('Leave cannot span two calendar years. Please apply separately.', 400);
  if (daysBetween(startDate, endDate) > 60) throw new AppError('A single request cannot exceed 60 days', 400);
  const earliest = type === 'sick' ? addDays(today, -7) : today;
  if (startDate < earliest) {
    throw new AppError(type === 'sick' ? 'Sick leave can be backdated by at most 7 days' : 'Start date cannot be in the past', 400);
  }

  const days = countWorkdays(startDate, endDate);
  if (days === 0) throw new AppError('The selected dates contain no working days (weekends/holidays are excluded)', 400);

  const overlap = await Leave.exists({
    user: user._id, status: { $in: ['pending', 'approved'] }, startDate: { $lte: endDate }, endDate: { $gte: startDate },
  });
  if (overlap) throw new AppError('You already have a pending or approved leave overlapping these dates', 409);

  const year = Number(startDate.slice(0, 4));
  await ensureBalances(user._id, year);
  const balance = await LeaveBalance.findOne({ user: user._id, year, type });
  const pending = await Leave.aggregate([
    { $match: { user: user._id, year, type, status: 'pending' } },
    { $group: { _id: null, d: { $sum: '$days' } } },
  ]);
  const available = balance.allocated - balance.used - (pending[0]?.d || 0);
  if (days > available) throw new AppError(`Insufficient ${type} leave balance. Available: ${available}, requested: ${days}`, 400);

  const leave = await Leave.create({ user: user._id, type, startDate, endDate, reason, days, year });
  await notifyUsers(await approversFor(user), {
    type: 'leave', title: 'New leave request', message: `${user.fullName} requested ${days} day(s) of ${type} leave`, link: '/app/leaves',
  });
  return leave;
}

function assertCanReview(actor, requester) {
  if (String(actor._id) === String(requester._id)) throw new AppError('You cannot review your own leave request', 403);
  if (actor.role === 'hr') return;
  if (actor.role === 'manager' && requester.manager && String(requester.manager) === String(actor._id)) return;
  throw new AppError('You are not authorized to review this request', 403);
}

async function loadForReview(actor, id) {
  const leave = await Leave.findById(id);
  if (!leave) throw new AppError('Leave request not found', 404);
  const requester = await User.findById(leave.user).select('manager');
  assertCanReview(actor, requester);
  if (leave.status !== 'pending') throw new AppError(`This request was already ${leave.status}`, 409);
  return leave;
}

export async function approveLeave(actor, id) {
  const leave = await loadForReview(actor, id);

  // Step 1: atomically "claim" the request. Only one concurrent reviewer can flip pending -> approved.
  const claimed = await Leave.findOneAndUpdate(
    { _id: id, status: 'pending' }, { status: 'approved', reviewedBy: actor._id, reviewedAt: new Date() }, { new: true }
  );
  if (!claimed) throw new AppError('This request was already processed', 409);

  // Step 2: deduct from the balance only if enough days remain (the check and $inc are one atomic operation).
  await ensureBalances(leave.user, leave.year);
  const deducted = await LeaveBalance.findOneAndUpdate(
    { user: leave.user, year: leave.year, type: leave.type, $expr: { $lte: [{ $add: ['$used', leave.days] }, '$allocated'] } },
    { $inc: { used: leave.days } }
  );
  if (!deducted) {
    // Compensating action: undo step 1 so data stays consistent.
    await Leave.updateOne({ _id: id }, { status: 'pending', $unset: { reviewedBy: '', reviewedAt: '' } });
    throw new AppError('Insufficient leave balance for this request', 400);
  }

  await notifyUsers([leave.user], { type: 'leave', title: 'Leave approved', message: `Your ${leave.type} leave ${leave.startDate} to ${leave.endDate} was approved`, link: '/app/leaves' });
  return claimed;
}

export async function rejectLeave(actor, id, reason) {
  const leave = await loadForReview(actor, id);
  const claimed = await Leave.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { status: 'rejected', reviewedBy: actor._id, reviewedAt: new Date(), rejectionReason: reason }, { new: true }
  );
  if (!claimed) throw new AppError('This request was already processed', 409);
  await notifyUsers([leave.user], { type: 'leave', title: 'Leave rejected', message: `Your ${leave.type} leave ${leave.startDate} to ${leave.endDate} was rejected: ${reason}`, link: '/app/leaves' });
  return claimed;
}

export async function cancelLeave(user, id) {
  const leave = await Leave.findById(id);
  if (!leave || String(leave.user) !== String(user._id)) throw new AppError('Leave request not found', 404);
  if (!['pending', 'approved'].includes(leave.status)) throw new AppError(`A ${leave.status} request cannot be cancelled`, 409);
  if (leave.status === 'approved' && leave.startDate <= toWorkDate()) throw new AppError('Approved leave that has already started cannot be cancelled', 400);

  const was = leave.status;
  const cancelled = await Leave.findOneAndUpdate({ _id: id, status: was }, { status: 'cancelled' }, { new: true });
  if (!cancelled) throw new AppError('This request was already processed', 409);
  if (was === 'approved') {
    // Give the days back to the balance.
    await LeaveBalance.updateOne({ user: leave.user, year: leave.year, type: leave.type }, { $inc: { used: -leave.days } });
  }
  return cancelled;
}

export async function listLeaves(actor, q, { skip, limit }, { mine = false } = {}) {
  const filter = {};
  if (mine) filter.user = actor._id;
  else {
    const uf = await resolveUserFilter(actor, q.user);
    if (uf) filter.user = uf;
  }
  if (q.status) filter.status = q.status;
  if (q.type) filter.type = q.type;
  const [items, total] = await Promise.all([
    Leave.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
      .populate('user', 'fullName employeeId').populate('reviewedBy', 'fullName').lean(),
    Leave.countDocuments(filter),
  ]);
  return { items, total };
}

export async function leaveCalendar(actor, month) {
  const start = `${month}-01`;
  const end = `${month}-31`; // lexicographic comparison on YYYY-MM-DD strings, so 31 is a safe upper bound
  const visible = actor.role === 'employee' ? [actor._id] : await visibleUserIds(actor);
  let ids = visible;
  if (actor.role === 'manager') ids = [...visible, actor._id];
  const filter = { status: 'approved', startDate: { $lte: end }, endDate: { $gte: start }, ...(ids ? { user: { $in: ids } } : {}) };
  return Leave.find(filter).populate('user', 'fullName').select('user type startDate endDate days').lean();
}
