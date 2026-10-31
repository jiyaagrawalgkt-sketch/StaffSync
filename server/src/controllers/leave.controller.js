import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated, pageParams } from '../utils/response.js';
import * as leaves from '../services/leave.service.js';

export const balances = asyncHandler(async (req, res) => ok(res, await leaves.getBalances(req.user, req.query.user, req.query.year)));
export const adjustBalance = asyncHandler(async (req, res) => ok(res, await leaves.adjustBalance(req.body), 'Balance updated'));
export const calendar = asyncHandler(async (req, res) => ok(res, await leaves.leaveCalendar(req.user, req.query.month)));
export const apply = asyncHandler(async (req, res) => ok(res, await leaves.applyLeave(req.user, req.body), 'Leave request submitted', 201));
export const mine = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await leaves.listLeaves(req.user, req.query, p, { mine: true });
  paginated(res, items, total, p);
});
export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await leaves.listLeaves(req.user, req.query, p);
  paginated(res, items, total, p);
});
export const approve = asyncHandler(async (req, res) => ok(res, await leaves.approveLeave(req.user, req.params.id), 'Leave approved'));
export const reject = asyncHandler(async (req, res) => ok(res, await leaves.rejectLeave(req.user, req.params.id, req.body.reason), 'Leave rejected'));
export const cancel = asyncHandler(async (req, res) => ok(res, await leaves.cancelLeave(req.user, req.params.id), 'Leave cancelled'));
