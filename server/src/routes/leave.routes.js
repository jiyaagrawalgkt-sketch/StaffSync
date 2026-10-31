import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { applyLeaveSchema, rejectLeaveSchema, leaveListQuery, calendarQuery, balanceQuery, adjustBalanceSchema } from '../validators/leave.validators.js';
import * as c from '../controllers/leave.controller.js';

const r = Router();
r.use(authenticate);
// Fixed paths first, then /:id routes
r.get('/balances', validate(balanceQuery, 'query'), c.balances);
r.put('/balances', authorize('hr'), validate(adjustBalanceSchema), c.adjustBalance);
r.get('/calendar', validate(calendarQuery, 'query'), c.calendar);
r.get('/me', validate(leaveListQuery, 'query'), c.mine);
r.get('/', authorize('hr', 'manager'), validate(leaveListQuery, 'query'), c.list);
r.post('/', validate(applyLeaveSchema), c.apply);
r.patch('/:id/approve', authorize('hr', 'manager'), validate(idParam, 'params'), c.approve);
r.patch('/:id/reject', authorize('hr', 'manager'), validate(idParam, 'params'), validate(rejectLeaveSchema), c.reject);
r.patch('/:id/cancel', validate(idParam, 'params'), c.cancel);
export default r;
