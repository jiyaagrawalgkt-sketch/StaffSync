// Fills the database with FICTIONAL demo data. Never run against production.
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { toWorkDate, addDays, isWorkday, countWorkdays, zonedToUtc, localMinutes, parseHM } from '../utils/dates.js';
import User from '../models/User.js';
import Department from '../models/Department.js';
import Attendance from '../models/Attendance.js';
import Leave from '../models/Leave.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Announcement from '../models/Announcement.js';
import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import Notification from '../models/Notification.js';
import Counter from '../models/Counter.js';

if (env.isProd) {
  console.error('Refusing to seed in production.');
  process.exit(1);
}

// Small deterministic random generator so the demo data is the same every run.
let seedState = 42;
const rand = () => {
  seedState |= 0; seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const between = (a, b) => Math.floor(rand() * (b - a + 1)) + a;
const DEMO_PASSWORD = 'Password@123';

await mongoose.connect(env.mongoUri);
console.log('Clearing old data...');
await Promise.all([User, Department, Attendance, Leave, LeaveBalance, Announcement, Training, TrainingEnrollment, Notification, Counter].map((m) => m.deleteMany({})));
await Promise.all([User, Department, Attendance, Leave, LeaveBalance, Announcement, Training, TrainingEnrollment, Notification].map((m) => m.syncIndexes()));

const today = toWorkDate();
const year = Number(today.slice(0, 4));
const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

const depts = await Department.insertMany([
  { name: 'Engineering', code: 'ENG', description: 'Product development and platform' },
  { name: 'Human Resources', code: 'HR', description: 'People operations' },
  { name: 'Sales', code: 'SAL', description: 'Business development' },
  { name: 'Finance', code: 'FIN', description: 'Accounts and budgeting' },
  { name: 'Operations', code: 'OPS', description: 'Day-to-day operations' },
]);
const D = Object.fromEntries(depts.map((d) => [d.code, d._id]));

let n = 0;
const mk = (fullName, email, role, dept, jobTitle, manager, extra = {}) => ({
  fullName, email: `${email}@staffsync.demo`, role, department: D[dept], jobTitle, manager: manager?._id ?? null,
  employeeId: `EMP-${String(++n).padStart(4, '0')}`, joiningDate: addDays(today, -between(60, 900)),
  employmentStatus: 'full-time', activated: true, passwordHash, phone: `98${between(10000000, 99999999)}`, ...extra,
});

const hr = await User.create(mk('Aarav Mehta', 'hr', 'hr', 'HR', 'HR Administrator', null));
const mEng = await User.create(mk('Priya Nair', 'manager.eng', 'manager', 'ENG', 'Engineering Manager', hr));
const mSal = await User.create(mk('Rohan Kapoor', 'manager.sales', 'manager', 'SAL', 'Sales Manager', hr));
const staff = await User.create([
  mk('Isha Verma', 'isha.verma', 'employee', 'ENG', 'Software Engineer', mEng),
  mk('Kabir Singh', 'kabir.singh', 'employee', 'ENG', 'Software Engineer', mEng),
  mk('Meera Iyer', 'meera.iyer', 'employee', 'ENG', 'QA Engineer', mEng),
  mk('Dev Patel', 'dev.patel', 'employee', 'ENG', 'DevOps Engineer', mEng),
  mk('Ananya Rao', 'ananya.rao', 'employee', 'ENG', 'UI Designer', mEng),
  mk('Rahul Desai', 'rahul.desai', 'employee', 'SAL', 'Account Executive', mSal),
  mk('Sneha Kulkarni', 'sneha.kulkarni', 'employee', 'SAL', 'Sales Associate', mSal),
  mk('Vikram Joshi', 'vikram.joshi', 'employee', 'SAL', 'Sales Associate', mSal),
  mk('Tara Menon', 'tara.menon', 'employee', 'SAL', 'Business Analyst', mSal),
  mk('Nikhil Bose', 'nikhil.bose', 'employee', 'FIN', 'Accountant', hr),
  mk('Pooja Sethi', 'pooja.sethi', 'employee', 'OPS', 'Operations Executive', hr),
  mk('Arjun Malhotra', 'arjun.malhotra', 'employee', 'OPS', 'Logistics Coordinator', hr),
]);
// An invited employee who has not activated the account yet (demonstrates the invitation flow)
const invited = await User.create(mk('Zoya Khan', 'zoya.khan', 'employee', 'ENG', 'Intern', mEng, { activated: false, passwordHash: undefined, employmentStatus: 'intern' }));
await Counter.create({ _id: 'employeeId', seq: n });

const everyone = [hr, mEng, mSal, ...staff];
const managerOf = (u) => (u.manager ? [hr, mEng, mSal].find((m) => String(m._id) === String(u.manager)) : hr);

// Leave balances
const balances = new Map();
for (const u of [...everyone, invited]) {
  for (const type of ['casual', 'sick', 'earned']) {
    balances.set(`${u._id}-${type}`, { user: u._id, year, type, allocated: env.leaveAllocations[type], used: 0 });
  }
}

// Leaves
const leaveDocs = [];
const approvedDays = new Map(); // userId -> Set(dates)
const nextWorkday = (d) => { let x = d; while (!isWorkday(x)) x = addDays(x, 1); return x; };
function addLeave(u, type, start, spanDays, status, reason) {
  const s = nextWorkday(start);
  let e = s;
  for (let i = 1; i < spanDays; i += 1) e = nextWorkday(addDays(e, 1));
  if (e.slice(0, 4) !== s.slice(0, 4)) e = s;
  const days = countWorkdays(s, e);
  const reviewer = managerOf(u);
  leaveDocs.push({
    user: u._id, type, startDate: s, endDate: e, year: Number(s.slice(0, 4)), days, reason, status,
    ...(status !== 'pending' ? { reviewedBy: reviewer._id, reviewedAt: new Date() } : {}),
    ...(status === 'rejected' ? { rejectionReason: 'Team deadline that week. Please reapply for a later date.' } : {}),
  });
  if (status === 'approved') {
    balances.get(`${u._id}-${type}`).used += days;
    const set = approvedDays.get(String(u._id)) || new Set();
    for (let d = s; d <= e; d = addDays(d, 1)) set.add(d);
    approvedDays.set(String(u._id), set);
  }
}
addLeave(staff[0], 'casual', addDays(today, -12), 2, 'approved', 'Family function out of town');
addLeave(staff[2], 'sick', addDays(today, -9), 1, 'approved', 'Fever and rest as advised');
addLeave(staff[5], 'earned', addDays(today, -15), 3, 'approved', 'Short vacation');
addLeave(staff[9], 'casual', addDays(today, -6), 1, 'approved', 'Personal errand');
addLeave(staff[1], 'earned', addDays(today, 8), 3, 'pending', 'Planned trip with family');
addLeave(staff[6], 'casual', addDays(today, 10), 1, 'pending', 'Attending a cousin\'s wedding');
addLeave(staff[10], 'sick', addDays(today, 3), 2, 'pending', 'Dental procedure and recovery');
addLeave(mEng, 'casual', addDays(today, 12), 1, 'pending', 'Personal work');
addLeave(staff[3], 'casual', addDays(today, -20), 1, 'rejected', 'Need a day off');
// An approved leave that includes today so dashboards show someone "on leave"
addLeave(staff[7], 'casual', today, 1, 'approved', 'Medical appointment');
await Leave.insertMany(leaveDocs);
await LeaveBalance.insertMany([...balances.values()]);

// Attendance for the last 21 days (workdays only, skipping approved leave days)
const lateAfter = parseHM(env.workStart) + env.lateGraceMinutes;
const attendance = [];
for (const u of everyone) {
  const skip = approvedDays.get(String(u._id)) || new Set();
  for (let i = 21; i >= 1; i -= 1) {
    const date = addDays(today, -i);
    if (!isWorkday(date) || skip.has(date) || rand() < 0.07) continue;
    const inMin = between(8 * 60 + 50, 10 * 60 + 10);
    const checkIn = zonedToUtc(date, Math.floor(inMin / 60), inMin % 60);
    const missed = rand() < 0.04;
    const outMin = between(17 * 60 + 15, 19 * 60);
    const checkOut = missed ? null : zonedToUtc(date, Math.floor(outMin / 60), outMin % 60);
    attendance.push({
      user: u._id, workDate: date, checkIn, checkOut, status: localMinutes(checkIn) > lateAfter ? 'late' : 'present',
      ...(checkOut ? { workMinutes: Math.round((checkOut - checkIn) / 60000) } : {}),
    });
  }
  // Today: about two thirds have already checked in
  if (isWorkday(today) && !skip.has(today) && rand() < 0.66) {
    const checkIn = new Date(Date.now() - between(5, 120) * 60000);
    attendance.push({ user: u._id, workDate: today, checkIn, status: localMinutes(checkIn) > lateAfter ? 'late' : 'present' });
  }
}
await Attendance.insertMany(attendance);

// Announcements
await Announcement.insertMany([
  { title: 'Welcome to StaffSync', body: 'StaffSync is now our HR portal. Please check in daily and apply for leave here.', status: 'published', publishedAt: new Date(Date.now() - 5 * 86400000), createdBy: hr._id },
  { title: 'Office closed on public holiday', body: 'The office will remain closed on the upcoming public holiday. Plan your work accordingly.', status: 'published', publishedAt: new Date(Date.now() - 2 * 86400000), createdBy: hr._id },
  { title: 'Engineering: release freeze', body: 'A release freeze is in effect from Thursday evening until Monday morning.', targetDepartments: [D.ENG], status: 'published', publishedAt: new Date(Date.now() - 86400000), createdBy: hr._id },
  { title: 'Draft: Annual appraisal schedule', body: 'Details of the appraisal cycle will be shared soon.', status: 'draft', createdBy: hr._id },
  { title: 'Old: Cafeteria timings', body: 'Cafeteria timings changed last quarter.', status: 'archived', publishedAt: new Date(Date.now() - 60 * 86400000), createdBy: hr._id },
]);

// Trainings and enrollments
const inDays = (d, h = 10) => new Date(Date.now() + d * 86400000 + h * 3600000);
const trainings = await Training.insertMany([
  { title: 'Secure Coding Basics', description: 'OWASP top 10 explained with hands-on examples.', startDate: inDays(6), endDate: inDays(6, 14), location: 'Training Room A', capacity: 20, status: 'published', createdBy: mEng._id },
  { title: 'Effective Communication', description: 'Writing clear emails and running effective meetings.', startDate: inDays(12), endDate: inDays(12, 13), location: 'Online', capacity: 0, status: 'published', createdBy: hr._id },
  { title: 'Leadership Workshop (small group)', description: 'Limited seats. For aspiring team leads.', startDate: inDays(15), endDate: inDays(15, 16), location: 'Conference Hall', capacity: 2, status: 'published', createdBy: hr._id },
  { title: 'Draft: Advanced Excel', description: 'Pivot tables and formulas for finance.', startDate: inDays(30), endDate: inDays(30, 15), location: 'Training Room B', capacity: 15, status: 'draft', createdBy: hr._id },
]);
const enrollPairs = [[0, staff[0]], [0, staff[1]], [0, staff[4]], [1, staff[5]], [1, staff[0]], [2, staff[2]], [2, staff[9]]];
await TrainingEnrollment.insertMany(enrollPairs.map(([i, u]) => ({ training: trainings[i]._id, user: u._id })));
for (const [i] of enrollPairs) trainings[i].enrolledCount += 1;
await Promise.all(trainings.map((t) => t.save()));

// Notifications
await Notification.insertMany([
  ...[hr, mEng, mSal, ...staff].map((u) => ({ user: u._id, type: 'announcement', title: 'New announcement', message: 'Welcome to StaffSync', link: '/app/announcements' })),
  { user: staff[0]._id, type: 'leave', title: 'Leave approved', message: 'Your casual leave was approved', link: '/app/leaves', isRead: true },
  { user: mEng._id, type: 'leave', title: 'New leave request', message: `${staff[1].fullName} requested 3 day(s) of earned leave`, link: '/app/leaves' },
  { user: hr._id, type: 'leave', title: 'New leave request', message: `${mEng.fullName} requested 1 day(s) of casual leave`, link: '/app/leaves' },
]);

console.log('\nSeed complete. All demo accounts use the password:', DEMO_PASSWORD);
console.log('  HR:       hr@staffsync.demo');
console.log('  Manager:  manager.eng@staffsync.demo   (team: Engineering)');
console.log('  Manager:  manager.sales@staffsync.demo (team: Sales)');
console.log('  Employee: isha.verma@staffsync.demo');
console.log('  Invited (not activated) employee: zoya.khan@staffsync.demo');
console.log('  Employees in Finance/Operations report to HR.');
await mongoose.disconnect();
