import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { toWorkDate, localMinutes, parseHM, isWorkday } from '../utils/dates.js';
import { resolveUserFilter } from './scope.js';

export const decorate = (r) => ({ ...r, missedCheckout: !r.checkOut && r.workDate < toWorkDate() });

const onApprovedLeave = (userId, date) =>
  Leave.exists({ user: userId, status: 'approved', startDate: { $lte: date }, endDate: { $gte: date } });

export async function getToday(user) {
  const date = toWorkDate();
  const record = await Attendance.findOne({ user: user._id, workDate: date }).lean();
  return {
    date,
    isWorkday: isWorkday(date),
    onLeave: Boolean(await onApprovedLeave(user._id, date)),
    record: record ? decorate(record) : null,
    rules: { workStart: env.workStart, lateGraceMinutes: env.lateGraceMinutes, timezone: env.timezone },
  };
}

export async function checkIn(user) {
  const now = new Date();
  const workDate = toWorkDate(now);
  if (!isWorkday(workDate)) throw new AppError('Today is a weekend or holiday. Attendance is not recorded.', 400);
  if (await onApprovedLeave(user._id, workDate)) throw new AppError('You are on approved leave today', 400);

  const late = localMinutes(now) > parseHM(env.workStart) + env.lateGraceMinutes;
  try {
    return await Attendance.create({ user: user._id, workDate, checkIn: now, status: late ? 'late' : 'present' });
  } catch (e) {
    // The unique index (user + workDate) stops duplicates even if two requests arrive at the same time.
    if (e.code === 11000) throw new AppError('You have already checked in today', 409);
    throw e;
  }
}

export async function checkOut(user) {
  const now = new Date();
  const workDate = toWorkDate(now);
  const record = await Attendance.findOne({ user: user._id, workDate });
  if (!record) throw new AppError('You must check in before checking out', 400);
  if (record.checkOut) throw new AppError('You have already checked out today', 409);

  const workMinutes = Math.max(0, Math.round((now - record.checkIn) / 60000));
  // Conditional update: succeeds only if checkOut is still empty (guards against double clicks).
  const updated = await Attendance.findOneAndUpdate({ _id: record._id, checkOut: null }, { checkOut: now, workMinutes }, { new: true });
  if (!updated) throw new AppError('You have already checked out today', 409);
  return updated;
}

export async function listAttendance(actor, q, { skip, limit }, { mine = false } = {}) {
  const filter = {};
  if (mine) filter.user = actor._id;
  else {
    const uf = await resolveUserFilter(actor, q.user);
    if (uf) filter.user = uf;
  }
  if (q.from || q.to) filter.workDate = { ...(q.from && { $gte: q.from }), ...(q.to && { $lte: q.to }) };
  const [items, total] = await Promise.all([
    Attendance.find(filter).sort({ workDate: -1, checkIn: -1 }).skip(skip).limit(limit).populate('user', 'fullName employeeId').lean(),
    Attendance.countDocuments(filter),
  ]);
  return { items: items.map(decorate), total };
}
