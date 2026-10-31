import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { notificationQuery } from '../validators/misc.validators.js';
import * as c from '../controllers/notification.controller.js';

const r = Router();
r.use(authenticate);
r.get('/', validate(notificationQuery, 'query'), c.list);
r.get('/unread-count', c.unreadCount);
r.patch('/read-all', c.markAllRead);
r.patch('/:id/read', validate(idParam, 'params'), c.markRead);
export default r;
