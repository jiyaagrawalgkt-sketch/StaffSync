import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated, pageParams } from '../utils/response.js';
import * as svc from '../services/training.service.js';

export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await svc.listTrainings(req.user, req.query, p);
  paginated(res, items, total, p);
});
export const mine = asyncHandler(async (req, res) => ok(res, await svc.myEnrollments(req.user)));
export const create = asyncHandler(async (req, res) => ok(res, await svc.createTraining(req.user, req.body), 'Training created', 201));
export const update = asyncHandler(async (req, res) => ok(res, await svc.updateTraining(req.user, req.params.id, req.body), 'Training updated'));
export const publish = asyncHandler(async (req, res) => ok(res, await svc.publishTraining(req.user, req.params.id), 'Training published'));
export const archive = asyncHandler(async (req, res) => ok(res, await svc.archiveTraining(req.user, req.params.id), 'Training archived'));
export const enroll = asyncHandler(async (req, res) => ok(res, await svc.enroll(req.user, req.params.id), 'Enrolled successfully', 201));
export const cancelEnrollment = asyncHandler(async (req, res) => { await svc.cancelEnrollment(req.user, req.params.id); ok(res, null, 'Enrollment cancelled'); });
export const enrollees = asyncHandler(async (req, res) => ok(res, await svc.enrollees(req.user, req.params.id)));
