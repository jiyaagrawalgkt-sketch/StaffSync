import Training from '../models/Training.js';
import TrainingEnrollment from '../models/TrainingEnrollment.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { notifyUsers } from './notification.service.js';

const canManage = (actor, t) => actor.role === 'hr' || (actor.role === 'manager' && String(t.createdBy?._id || t.createdBy) === String(actor._id));

async function loadManageable(actor, id) {
  const t = await Training.findById(id);
  if (!t) throw new AppError('Training not found', 404);
  if (!canManage(actor, t)) throw new AppError('You can only manage trainings you created', 403);
  return t;
}

export const createTraining = (actor, data) => Training.create({ ...data, createdBy: actor._id });

export async function updateTraining(actor, id, data) {
  const t = await loadManageable(actor, id);
  if (t.status === 'archived') throw new AppError('Archived programs cannot be edited', 400);
  if (data.capacity !== undefined && data.capacity > 0 && data.capacity < t.enrolledCount) {
    throw new AppError(`Capacity cannot be lower than current enrollments (${t.enrolledCount})`, 400);
  }
  t.set(data);
  if (t.endDate < t.startDate) throw new AppError('End must not be before start', 400);
  await t.save();
  return t;
}

export async function publishTraining(actor, id) {
  const t = await loadManageable(actor, id);
  const updated = await Training.findOneAndUpdate({ _id: t._id, status: 'draft' }, { status: 'published' }, { new: true });
  if (!updated) throw new AppError('Only draft programs can be published', 400);
  await notifyUsers(await User.find({ isActive: true, activated: true }).distinct('_id'), { type: 'training', title: 'New training program', message: updated.title, link: '/app/trainings' });
  return updated;
}

export async function archiveTraining(actor, id) {
  const t = await loadManageable(actor, id);
  t.status = 'archived';
  await t.save();
  return t;
}

export async function listTrainings(actor, q, { skip, limit }) {
  let filter;
  if (actor.role === 'hr') filter = q.status ? { status: q.status } : {};
  else if (actor.role === 'manager') filter = { $or: [{ status: 'published' }, { createdBy: actor._id }], ...(q.status ? { status: q.status } : {}) };
  else filter = { status: 'published' };

  const [rows, total] = await Promise.all([
    Training.find(filter).sort({ startDate: -1 }).skip(skip).limit(limit).populate('createdBy', 'fullName').lean(),
    Training.countDocuments(filter),
  ]);
  const enrolled = await TrainingEnrollment.find({ user: actor._id, training: { $in: rows.map((r) => r._id) } }).distinct('training');
  const set = new Set(enrolled.map(String));
  const now = new Date();
  const items = rows.map((t) => ({
    ...t, isEnrolled: set.has(String(t._id)), canManage: canManage(actor, t), hasStarted: t.startDate <= now, isFull: t.capacity > 0 && t.enrolledCount >= t.capacity,
  }));
  return { items, total };
}

export async function enroll(user, id) {
  const now = new Date();
  // One atomic step: only increments if the program is published, not finished and has space.
  const training = await Training.findOneAndUpdate(
    { _id: id, status: 'published', endDate: { $gte: now }, $or: [{ capacity: 0 }, { $expr: { $lt: ['$enrolledCount', '$capacity'] } }] },
    { $inc: { enrolledCount: 1 } }, { new: true }
  );
  if (!training) {
    const t = await Training.findById(id);
    if (!t) throw new AppError('Training not found', 404);
    if (t.status !== 'published') throw new AppError('This program is not open for enrollment', 400);
    if (t.endDate < now) throw new AppError('This program has already ended', 400);
    throw new AppError('This program is full', 400);
  }
  try {
    return await TrainingEnrollment.create({ training: id, user: user._id });
  } catch (e) {
    await Training.updateOne({ _id: id }, { $inc: { enrolledCount: -1 } }); // undo the increment
    if (e.code === 11000) throw new AppError('You are already enrolled in this program', 409);
    throw e;
  }
}

export async function cancelEnrollment(user, id) {
  const t = await Training.findById(id);
  if (!t) throw new AppError('Training not found', 404);
  if (t.startDate <= new Date()) throw new AppError('Enrollment cannot be cancelled after the program has started', 400);
  const removed = await TrainingEnrollment.findOneAndDelete({ training: id, user: user._id });
  if (!removed) throw new AppError('You are not enrolled in this program', 404);
  await Training.updateOne({ _id: id, enrolledCount: { $gt: 0 } }, { $inc: { enrolledCount: -1 } });
}

export const myEnrollments = (user) =>
  TrainingEnrollment.find({ user: user._id }).sort({ createdAt: -1 }).populate('training', 'title startDate endDate location status').lean();

export async function enrollees(actor, id) {
  await loadManageable(actor, id);
  return TrainingEnrollment.find({ training: id }).sort({ createdAt: 1 })
    .populate({ path: 'user', select: 'fullName employeeId email department', populate: { path: 'department', select: 'name' } }).lean();
}
