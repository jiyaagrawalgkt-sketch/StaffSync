import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/response.js';
import * as reports from '../services/report.service.js';

export const summary = asyncHandler(async (req, res) => ok(res, await reports.summary(req.user, req.query)));
export const dashboard = asyncHandler(async (req, res) => ok(res, await reports.dashboard(req.user)));
