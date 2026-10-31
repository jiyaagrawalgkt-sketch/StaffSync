import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import * as auth from '../services/auth.service.js';

export const config = (req, res) =>
  ok(res, { timezone: env.timezone, workStart: env.workStart, lateGraceMinutes: env.lateGraceMinutes, weekendDays: env.weekendDays, holidays: env.holidays });

export const setupStatus = asyncHandler(async (req, res) => ok(res, { needsSetup: (await User.estimatedDocumentCount()) === 0 }));

export const setup = asyncHandler(async (req, res) => {
  const { user, token } = await auth.setupFirstAdmin(req.body);
  auth.setAuthCookie(res, token);
  ok(res, user, 'HR administrator created', 201);
});

export const login = asyncHandler(async (req, res) => {
  const { user, token } = await auth.login(req.body);
  auth.setAuthCookie(res, token);
  ok(res, user, 'Logged in');
});

export const logout = (req, res) => {
  res.clearCookie('token', auth.cookieOptions());
  ok(res, null, 'Logged out');
};

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('department', 'name code').populate('manager', 'fullName employeeId');
  ok(res, user);
});

// Only whitelisted fields (validated by zod) can be changed here. Role, manager, etc. are HR-controlled.
export const updateMe = asyncHandler(async (req, res) => {
  req.user.set(req.body);
  await req.user.save();
  ok(res, req.user, 'Profile updated');
});

export const changePassword = asyncHandler(async (req, res) => {
  const { token } = await auth.changePassword(req.user._id, req.body);
  auth.setAuthCookie(res, token);
  ok(res, null, 'Password changed');
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const { user, token } = await auth.acceptInvite(req.body);
  auth.setAuthCookie(res, token);
  ok(res, user, 'Account activated');
});
