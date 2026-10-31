import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { attendanceQuery } from '../validators/attendance.validators.js';
import * as c from '../controllers/attendance.controller.js';

const r = Router();
r.use(authenticate);
r.get('/today', c.today);
r.post('/check-in', c.checkIn);
r.post('/check-out', c.checkOut);
r.get('/me', validate(attendanceQuery, 'query'), c.mine);
r.get('/', authorize('hr', 'manager'), validate(attendanceQuery, 'query'), c.list);
export default r;
