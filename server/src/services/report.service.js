import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import { AppError } from '../utils/AppError.js';
import { toWorkDate, addDays, daysBetween, isWorkday } from '../utils/dates.js';
import { visibleUserIds, teamIds, oid } from './scope.js';
import { latestVisible } from './announcement.service.js';
import { getBalances } from './leave.service.js';

function resolveRange(q) {
  const to = q.to || toWorkDate();
  const from = q.from || addDays(to, -29);
  if (from > to) throw new AppError('"from" date must not be after "to" date', 400);
  if (daysBetween(from, to) > 366) throw new AppError('Date range cannot exceed one year', 400);
  return { from, to };
}

// null = all users (HR), otherwise an array of ObjectIds. Optional department narrows it further.
async function scopeIds(actor, department) {
  let ids = await visibleUserIds(actor);
  if (department) {
    const inDept = await User.find({ department }).distinct('_id');
    ids = ids ? inDept.filter((d) => ids.some((i) => String(i) === String(d))) : inDept;
  }
  return ids;
}

const userMatch = (ids) => (ids ? { user: { $in: ids } } : {});
const countIf = (cond) => ({ $sum: { $cond: [cond, 1, 0] } });

export async function employeesByDepartment(ids) {
  return User.aggregate([
    { $match: { isActive: true, ...(ids ? { _id: { $in: ids } } : {}) } },
    { $group: { _id: '$department', count: { $sum: 1 } } },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
    { $project: { _id: 0, name: { $ifNull: [{ $arrayElemAt: ['$d.name', 0] }, 'Unassigned'] }, count: 1 } },
    { $sort: { count: -1 } },
  ]);
}

export const attendanceTrend = (ids, from, to) =>
  Attendance.aggregate([
    { $match: { workDate: { $gte: from, $lte: to }, ...userMatch(ids) } },
    { $group: { _id: '$workDate', present: countIf({ $eq: ['$status', 'present'] }), late: countIf({ $eq: ['$status', 'late'] }) } },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', present: 1, late: 1 } },
  ]);

async function attendanceDistribution(ids, from, to) {
  const today = toWorkDate();
  const [row] = await Attendance.aggregate([
    { $match: { workDate: { $gte: from, $lte: to }, ...userMatch(ids) } },
    {
      $group: {
        _id: null,
        present: countIf({ $eq: ['$status', 'present'] }),
        late: countIf({ $eq: ['$status', 'late'] }),
        // $lte against null is true for both null and missing values
        missedCheckout: countIf({ $and: [{ $lte: ['$checkOut', null] }, { $lt: ['$workDate', today] }] }),
      },
    },
  ]);
  return { present: row?.present || 0, late: row?.late || 0, missedCheckout: row?.missedCheckout || 0 };
}

const leavesByStatus = (ids, from, to) =>
  Leave.aggregate([
    { $match: { startDate: { $gte: from, $lte: to }, ...userMatch(ids) } },
    { $group: { _id: '$status', count: { $sum: 1 }, days: { $sum: '$days' } } },
    { $project: { _id: 0, status: '$_id', count: 1, days: 1 } },
  ]);

const departmentAttendance = (ids, from, to) =>
  Attendance.aggregate([
    { $match: { workDate: { $gte: from, $lte: to }, ...userMatch(ids) } },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    {
      $group: {
        _id: '$u.department', records: { $sum: 1 },
        present: countIf({ $eq: ['$status', 'present'] }), late: countIf({ $eq: ['$status', 'late'] }),
        avgWorkMinutes: { $avg: '$workMinutes' },
      },
    },
    { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'd' } },
    {
      $project: {
        _id: 0, records: 1, present: 1, late: 1,
        department: { $ifNull: [{ $arrayElemAt: ['$d.name', 0] }, 'Unassigned'] },
        avgWorkHours: { $round: [{ $divide: [{ $ifNull: ['$avgWorkMinutes', 0] }, 60] }, 1] },
      },
    },
    { $sort: { records: -1 } },
  ]);

const trainingSummary = () =>
  Training.find({ status: 'published' }).sort({ startDate: -1 }).limit(10).select('title capacity enrolledCount startDate').lean();

export async function summary(actor, q) {
  const { from, to } = resolveRange(q);
  const ids = await scopeIds(actor, q.department);
  const [byDepartment, trend, distribution, leaves, deptAttendance, trainings] = await Promise.all([
    employeesByDepartment(ids), attendanceTrend(ids, from, to), attendanceDistribution(ids, from, to),
    leavesByStatus(ids, from, to), departmentAttendance(ids, from, to), trainingSummary(),
  ]);
  return { range: { from, to }, employeesByDepartment: byDepartment, attendanceTrend: trend, attendanceDistribution: distribution, leavesByStatus: leaves, departmentAttendance: deptAttendance, trainingSummary: trainings };
}

// ---------------- dashboards ----------------
async function recentActivity(ids) {
  const m = userMatch(ids);
  const [att, leaves, enr] = await Promise.all([
    Attendance.find(m).sort({ updatedAt: -1 }).limit(8).populate('user', 'fullName').lean(),
    Leave.find(m).sort({ updatedAt: -1 }).limit(8).populate('user', 'fullName').lean(),
    TrainingEnrollment.find(m).sort({ createdAt: -1 }).limit(8).populate('user', 'fullName').populate('training', 'title').lean(),
  ]);
  const rows = [
    ...att.filter((a) => a.user).map((a) => ({ at: a.updatedAt, text: `${a.user.fullName} ${a.checkOut ? 'checked out' : 'checked in'}`, kind: 'attendance' })),
    ...leaves.filter((l) => l.user).map((l) => ({ at: l.updatedAt, text: `${l.user.fullName}: ${l.type} leave ${l.startDate} to ${l.endDate} is ${l.status}`, kind: 'leave' })),
    ...enr.filter((e) => e.user && e.training).map((e) => ({ at: e.createdAt, text: `${e.user.fullName} enrolled in "${e.training.title}"`, kind: 'training' })),
  ];
  return rows.sort((a, b) => b.at - a.at).slice(0, 10);
}

const upcomingTrainings = (limit = 5) =>
  Training.find({ status: 'published', endDate: { $gte: new Date() } }).sort({ startDate: 1 }).limit(limit).select('title startDate endDate location capacity enrolledCount').lean();

async function todaySummary(ids) {
  const date = toWorkDate();
  const m = userMatch(ids);
  const [totalActive, checkedIn, late, onLeave] = await Promise.all([
    User.countDocuments({ isActive: true, ...(ids ? { _id: { $in: ids } } : {}) }),
    Attendance.countDocuments({ workDate: date, ...m }),
    Attendance.countDocuments({ workDate: date, status: 'late', ...m }),
    Leave.countDocuments({ status: 'approved', startDate: { $lte: date }, endDate: { $gte: date }, ...m }),
  ]);
  const workday = isWorkday(date);
  return { date, isWorkday: workday, totalActive, checkedIn, late, onLeave, absent: workday ? Math.max(0, totalActive - checkedIn - onLeave) : 0 };
}

async function hrDashboard(actor) {
  const to = toWorkDate();
  const [today, byDepartment, pendingCount, pendingLatest, trend, leaves, announcements, trainings, activity] = await Promise.all([
    todaySummary(null), employeesByDepartment(null), Leave.countDocuments({ status: 'pending' }),
    Leave.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).populate('user', 'fullName employeeId').lean(),
    attendanceTrend(null, addDays(to, -13), to), leavesByStatus(null, addDays(to, -29), to),
    latestVisible(actor), upcomingTrainings(), recentActivity(null),
  ]);
  return { role: 'hr', today, totalActiveEmployees: today.totalActive, employeesByDepartment: byDepartment, pendingLeaves: { count: pendingCount, latest: pendingLatest }, attendanceTrend: trend, leavesByStatus: leaves, announcements, upcomingTrainings: trainings, recentActivity: activity };
}

async function managerDashboard(actor) {
  const ids = await teamIds(actor._id);
  const date = toWorkDate();
  const [today, members, todayRecords, onLeaveRows, pending, announcements, trainings, activity] = await Promise.all([
    todaySummary(ids),
    User.find({ manager: actor._id, isActive: true }).select('fullName employeeId jobTitle').sort({ fullName: 1 }).lean(),
    Attendance.find({ workDate: date, user: { $in: ids } }).lean(),
    Leave.find({ status: 'approved', startDate: { $lte: date }, endDate: { $gte: date }, user: { $in: ids } }).distinct('user'),
    Leave.find({ status: 'pending', user: { $in: ids } }).sort({ createdAt: 1 }).limit(10).populate('user', 'fullName employeeId').lean(),
    latestVisible(actor), upcomingTrainings(), recentActivity(ids),
  ]);
  const rec = new Map(todayRecords.map((r) => [String(r.user), r]));
  const leaveSet = new Set(onLeaveRows.map(String));
  const team = members.map((m) => {
    const r = rec.get(String(m._id));
    let status = 'absent';
    if (!today.isWorkday) status = 'non-working-day';
    else if (leaveSet.has(String(m._id))) status = 'on-leave';
    else if (r) status = r.checkOut ? 'checked-out' : r.status === 'late' ? 'late' : 'checked-in';
    return { ...m, todayStatus: status, checkIn: r?.checkIn, checkOut: r?.checkOut };
  });
  return { role: 'manager', today, team, pendingLeaves: { count: pending.length, latest: pending }, announcements, upcomingTrainings: trainings, recentActivity: activity };
}

async function employeeDashboard(actor) {
  const to = toWorkDate();
  const user = await User.findById(actor._id).populate('department', 'name').populate('manager', 'fullName');
  const [todayRecord, balances, leaves, history, announcements, trainings] = await Promise.all([
    Attendance.findOne({ user: actor._id, workDate: to }).lean(),
    getBalances(actor), Leave.find({ user: actor._id }).sort({ createdAt: -1 }).limit(5).lean(),
    Attendance.find({ user: actor._id }).sort({ workDate: -1 }).limit(7).lean(),
    latestVisible(actor), upcomingTrainings(),
  ]);
  const enrolled = new Set((await TrainingEnrollment.find({ user: actor._id }).distinct('training')).map(String));
  return {
    role: 'employee', profile: user, today: { date: to, isWorkday: isWorkday(to), record: todayRecord }, balances, leaves, history,
    announcements, availableTrainings: trainings.map((t) => ({ ...t, isEnrolled: enrolled.has(String(t._id)) })),
  };
}

export const dashboard = (actor) =>
  actor.role === 'hr' ? hrDashboard(actor) : actor.role === 'manager' ? managerDashboard(actor) : employeeDashboard(actor);

export { oid };
