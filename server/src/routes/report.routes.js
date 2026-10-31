import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reportQuery } from '../validators/misc.validators.js';
import * as c from '../controllers/report.controller.js';

const r = Router();
r.use(authenticate);
r.get('/summary', authorize('hr', 'manager'), validate(reportQuery, 'query'), c.summary);
export const dashboardRouter = Router();
dashboardRouter.get('/', authenticate, c.dashboard);
export default r;
