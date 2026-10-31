import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated, pageParams } from '../utils/response.js';
import * as att from '../services/attendance.service.js';

export const today = asyncHandler(async (req, res) => ok(res, await att.getToday(req.user)));
export const checkIn = asyncHandler(async (req, res) => ok(res, await att.checkIn(req.user), 'Checked in', 201));
export const checkOut = asyncHandler(async (req, res) => ok(res, await att.checkOut(req.user), 'Checked out'));
export const mine = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await att.listAttendance(req.user, req.query, p, { mine: true });
  paginated(res, items, total, p);
});
export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await att.listAttendance(req.user, req.query, p);
  paginated(res, items, total, p);
});
