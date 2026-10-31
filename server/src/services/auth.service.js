import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { nextSequence } from '../models/Counter.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';
import { toWorkDate } from '../utils/dates.js';
import { ensureBalances } from './leave.service.js';

export const hashPassword = (plain) => bcrypt.hash(plain, env.bcryptRounds);
// Invite tokens are 256 random bits, so a fast SHA-256 is enough (no need for slow bcrypt).
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', env.bcryptRounds);

export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export const signToken = (user) => jwt.sign({ sub: String(user._id) }, env.jwtSecret, { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

export const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd || env.crossSiteCookies,
  sameSite: env.crossSiteCookies ? 'none' : 'lax',
  path: '/',
});

export const setAuthCookie = (res, token) => res.cookie('token', token, { ...cookieOptions(), maxAge: env.cookieMaxAgeMs });

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  // Always run bcrypt, even for unknown emails, so response time does not reveal which emails exist.
  const passwordOk = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);
  if (!user || !user.passwordHash || !passwordOk) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('Your account is deactivated. Please contact HR.', 403);

  user.lastLoginAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
}

export async function setupFirstAdmin({ fullName, email, password, setupKey }) {
  if (!env.setupKey) throw new AppError('Setup is disabled. Set SETUP_KEY in server/.env first.', 403);
  if (!safeEqual(setupKey, env.setupKey)) throw new AppError('Invalid setup key', 403);
  if ((await User.estimatedDocumentCount()) > 0) throw new AppError('Setup has already been completed', 409);

  const seq = await nextSequence('employeeId');
  const user = await User.create({
    fullName, email, role: 'hr', jobTitle: 'HR Administrator',
    employeeId: `EMP-${String(seq).padStart(4, '0')}`,
    joiningDate: toWorkDate(), passwordHash: await hashPassword(password), activated: true,
  });
  await ensureBalances(user._id);
  return { user, token: signToken(user) };
}

export async function acceptInvite({ token, password }) {
  const user = await User.findOne({ inviteTokenHash: hashToken(token), inviteExpires: { $gt: new Date() } })
    .select('+inviteTokenHash +inviteExpires');
  if (!user || !user.isActive) throw new AppError('This invitation link is invalid or has expired', 400);

  user.passwordHash = await hashPassword(password);
  user.activated = true;
  user.passwordChangedAt = new Date();
  user.inviteTokenHash = undefined;
  user.inviteExpires = undefined;
  await user.save();
  return { user, token: signToken(user) };
}

export async function changePassword(userId, { currentPassword, newPassword }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError('Current password is incorrect', 400);
  if (currentPassword === newPassword) throw new AppError('New password must be different from the current one', 400);

  user.passwordHash = await hashPassword(newPassword);
  user.passwordChangedAt = new Date();
  await user.save();
  return { user, token: signToken(user) };
}
