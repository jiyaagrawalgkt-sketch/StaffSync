import mongoose from 'mongoose';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export const oid = (v) => new mongoose.Types.ObjectId(String(v));

export const teamIds = (managerId) => User.find({ manager: managerId }).distinct('_id');

// Who can this person see? null = everyone (HR). Otherwise an array of user ids.
export async function visibleUserIds(actor) {
  if (actor.role === 'hr') return null;
  if (actor.role === 'manager') return teamIds(actor._id);
  return [actor._id];
}

export async function canAccessUser(actor, targetId) {
  if (actor.role === 'hr') return true;
  if (String(actor._id) === String(targetId)) return true;
  if (actor.role === 'manager') return Boolean(await User.exists({ _id: targetId, manager: actor._id }));
  return false;
}

export async function assertCanAccessUser(actor, targetId) {
  if (!(await canAccessUser(actor, targetId))) {
    throw new AppError('You do not have access to this employee', 403);
  }
}

// Builds the value for `filter.user` in a query, honouring the actor's scope.
export async function resolveUserFilter(actor, requestedUser) {
  const visible = await visibleUserIds(actor);
  if (requestedUser) {
    if (visible && !visible.some((id) => String(id) === String(requestedUser))) {
      throw new AppError('You do not have access to this employee', 403);
    }
    return requestedUser;
  }
  return visible ? { $in: visible } : undefined;
}
