import { asyncHandler } from '../utils/asyncHandler.js';
import { ok, paginated, pageParams } from '../utils/response.js';
import * as svc from '../services/announcement.service.js';

export const list = asyncHandler(async (req, res) => {
  const p = pageParams(req.query);
  const { items, total } = await svc.listAnnouncements(req.user, req.query, p);
  paginated(res, items, total, p);
});
export const create = asyncHandler(async (req, res) => ok(res, await svc.createAnnouncement(req.user, req.body), 'Announcement created', 201));
export const update = asyncHandler(async (req, res) => ok(res, await svc.updateAnnouncement(req.params.id, req.body), 'Announcement updated'));
export const publish = asyncHandler(async (req, res) => ok(res, await svc.publishAnnouncement(req.params.id), 'Announcement published'));
export const archive = asyncHandler(async (req, res) => ok(res, await svc.archiveAnnouncement(req.params.id), 'Announcement archived'));
