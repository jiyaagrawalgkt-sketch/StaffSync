import Notification from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ok, paginated, pageParams } from '../utils/response.js';

export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const filter = { user: req.user._id, ...(req.query.unread === 'true' ? { isRead: false } : {}) };
  const [items, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(p.skip).limit(p.limit).lean(),
    Notification.countDocuments(filter),
  ]);
  paginated(res, items, total, p);
});
export const unreadCount = asyncHandler(async (req, res) => ok(res, { count: await Notification.countDocuments({ user: req.user._id, isRead: false }) }));
export const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { isRead: true }, { new: true });
  if (!n) throw new AppError('Notification not found', 404);
  ok(res, n);
});
export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  ok(res, null, 'All notifications marked as read');
});
