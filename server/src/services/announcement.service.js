import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { notifyUsers } from './notification.service.js';

export const visibleFilter = (user) => ({
  status: 'published',
  $or: [{ targetDepartments: { $size: 0 } }, ...(user.department ? [{ targetDepartments: user.department }] : [])],
});

export const latestVisible = (user, limit = 5) =>
  Announcement.find(visibleFilter(user)).sort({ publishedAt: -1 }).limit(limit).populate('targetDepartments', 'name').lean();

export async function listAnnouncements(actor, q, { skip, limit }) {
  const filter = actor.role === 'hr' ? (q.status ? { status: q.status } : {}) : visibleFilter(actor);
  const [items, total] = await Promise.all([
    Announcement.find(filter).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit)
      .populate('targetDepartments', 'name').populate('createdBy', 'fullName').lean(),
    Announcement.countDocuments(filter),
  ]);
  return { items, total };
}

export const createAnnouncement = (actor, data) => Announcement.create({ ...data, createdBy: actor._id });

export async function updateAnnouncement(id, data) {
  const a = await Announcement.findById(id);
  if (!a) throw new AppError('Announcement not found', 404);
  if (a.status === 'archived') throw new AppError('Archived announcements cannot be edited', 400);
  a.set(data);
  await a.save();
  return a;
}

export async function publishAnnouncement(id) {
  const a = await Announcement.findOneAndUpdate({ _id: id, status: 'draft' }, { status: 'published', publishedAt: new Date() }, { new: true });
  if (!a) throw new AppError('Only draft announcements can be published', 400);
  const audience = { isActive: true, activated: true, ...(a.targetDepartments.length ? { department: { $in: a.targetDepartments } } : {}) };
  await notifyUsers(await User.find(audience).distinct('_id'), { type: 'announcement', title: 'New announcement', message: a.title, link: '/app/announcements' });
  return a;
}

export async function archiveAnnouncement(id) {
  const a = await Announcement.findOneAndUpdate({ _id: id, status: { $ne: 'archived' } }, { status: 'archived' }, { new: true });
  if (!a) throw new AppError('Announcement not found or already archived', 404);
  return a;
}
