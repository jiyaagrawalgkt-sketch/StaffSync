import Notification from '../models/Notification.js';
import User from '../models/User.js';

export async function notifyUsers(userIds, { type, title, message, link }) {
  if (!userIds.length) return;
  await Notification.insertMany(userIds.map((user) => ({ user, type, title, message, link })));
}

export const activeHrIds = (excludeId) =>
  User.find({ role: 'hr', isActive: true, activated: true, ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).distinct('_id');
