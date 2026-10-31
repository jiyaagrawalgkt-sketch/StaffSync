import crypto from 'crypto';
import User from '../models/User.js';
import Department from '../models/Department.js';
import { nextSequence } from '../models/Counter.js';
import { AppError } from '../utils/AppError.js';
import { toWorkDate } from '../utils/dates.js';
import { escapeRegex } from '../utils/response.js';
import { hashToken } from './auth.service.js';
import { ensureBalances } from './leave.service.js';
import { assertCanAccessUser } from './scope.js';

const clean = (data) => {
  const out = { ...data };
  for (const k of ['department', 'manager', 'employeeId', 'phone']) if (out[k] === '') out[k] = k === 'phone' ? '' : null;
  if (out.employeeId === null) delete out.employeeId;
  return out;
};

async function assertManager(managerId, selfId) {
  if (!managerId) return;
  if (selfId && String(managerId) === String(selfId)) throw new AppError('An employee cannot be their own manager', 400);
  const m = await User.findById(managerId);
  if (!m || !m.isActive || !['manager', 'hr'].includes(m.role)) {
    throw new AppError('Manager must be an active user with the manager or HR role', 400);
  }
}

async function assertDepartment(id) {
  if (id && !(await Department.exists({ _id: id }))) throw new AppError('Department not found', 400);
}

async function generateEmployeeId() {
  for (let i = 0; i < 20; i += 1) {
    const id = `EMP-${String(await nextSequence('employeeId')).padStart(4, '0')}`;
    if (!(await User.exists({ employeeId: id }))) return id;
  }
  throw new AppError('Could not generate an employee ID', 500);
}

async function assertNotLastHr(user) {
  if (user.role === 'hr' && user.isActive) {
    const others = await User.countDocuments({ role: 'hr', isActive: true, _id: { $ne: user._id } });
    if (others === 0) throw new AppError('At least one active HR administrator is required', 400);
  }
}

function makeInvite() {
  const token = crypto.randomBytes(32).toString('hex');
  return { token, hash: hashToken(token), expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) };
}

export async function createUser(input) {
  const data = clean(input);
  await assertManager(data.manager);
  await assertDepartment(data.department);
  const invite = makeInvite();
  const user = await User.create({
    ...data,
    role: data.role || 'employee',
    joiningDate: data.joiningDate || toWorkDate(),
    employeeId: data.employeeId || (await generateEmployeeId()),
    inviteTokenHash: invite.hash,
    inviteExpires: invite.expires,
    activated: false,
  });
  await ensureBalances(user._id);
  return { user, inviteToken: invite.token };
}

export async function updateUser(actor, id, input) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Employee not found', 404);
  const data = clean(input);

  if (String(actor._id) === String(id) && data.role && data.role !== user.role) {
    throw new AppError('You cannot change your own role', 400);
  }
  if (data.role && data.role !== user.role) await assertNotLastHr(user);
  if (data.manager !== undefined) await assertManager(data.manager, id);
  if (data.department) await assertDepartment(data.department);

  user.set(data);
  await user.save();
  return user;
}

export async function setStatus(actor, id, isActive) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Employee not found', 404);
  if (!isActive) {
    if (String(actor._id) === String(id)) throw new AppError('You cannot deactivate your own account', 400);
    await assertNotLastHr(user);
  }
  user.isActive = isActive;
  await user.save();
  return user;
}

export async function reinvite(id) {
  const user = await User.findById(id);
  if (!user) throw new AppError('Employee not found', 404);
  if (user.activated) throw new AppError('This employee has already activated their account', 400);
  const invite = makeInvite();
  user.inviteTokenHash = invite.hash;
  user.inviteExpires = invite.expires;
  await user.save();
  return { user, inviteToken: invite.token };
}

const SORTS = { name: { fullName: 1 }, '-name': { fullName: -1 }, joiningDate: { joiningDate: 1 }, '-joiningDate': { joiningDate: -1 }, employeeId: { employeeId: 1 } };

export async function listUsers(actor, q, { skip, limit }) {
  const filter = {};
  if (actor.role === 'manager') filter.manager = actor._id; // managers only ever see their own team
  if (q.department) filter.department = q.department;
  if (q.role) filter.role = q.role;
  if (q.status) filter.isActive = q.status === 'active';
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [{ fullName: rx }, { email: rx }, { employeeId: rx }];
  }
  const [items, total] = await Promise.all([
    User.find(filter).sort(SORTS[q.sort]).skip(skip).limit(limit)
      .populate('department', 'name code').populate('manager', 'fullName employeeId').lean(),
    User.countDocuments(filter),
  ]);
  return { items, total };
}

export async function getUser(actor, id) {
  await assertCanAccessUser(actor, id);
  const user = await User.findById(id).populate('department', 'name code').populate('manager', 'fullName employeeId');
  if (!user) throw new AppError('Employee not found', 404);
  return user;
}

export const listManagers = () =>
  User.find({ role: { $in: ['manager', 'hr'] }, isActive: true }).select('fullName employeeId role').sort({ fullName: 1 }).lean();
