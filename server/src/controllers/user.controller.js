import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated, pageParams } from '../utils/response.js';
import * as users from '../services/user.service.js';

export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await users.listUsers(req.user, req.query, p);
  paginated(res, items, total, p);
});
export const managers = asyncHandler(async (req, res) => ok(res, await users.listManagers()));
export const getOne = asyncHandler(async (req, res) => ok(res, await users.getUser(req.user, req.params.id)));
export const create = asyncHandler(async (req, res) => ok(res, await users.createUser(req.body), 'Employee created', 201));
export const update = asyncHandler(async (req, res) => ok(res, await users.updateUser(req.user, req.params.id, req.body), 'Employee updated'));
export const setStatus = asyncHandler(async (req, res) => {
  const user = await users.setStatus(req.user, req.params.id, req.body.isActive);
  ok(res, user, user.isActive ? 'Account activated' : 'Account deactivated');
});
export const reinvite = asyncHandler(async (req, res) => ok(res, await users.reinvite(req.params.id), 'New invitation created'));
