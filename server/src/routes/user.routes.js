import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createUserSchema, updateUserSchema, statusSchema, listUsersQuery } from '../validators/user.validators.js';
import * as c from '../controllers/user.controller.js';

const r = Router();
r.use(authenticate);
r.get('/managers', authorize('hr'), c.managers);
r.get('/', authorize('hr', 'manager'), validate(listUsersQuery, 'query'), c.list);
r.post('/', authorize('hr'), validate(createUserSchema), c.create);
r.get('/:id', validate(idParam, 'params'), c.getOne);
r.patch('/:id', authorize('hr'), validate(idParam, 'params'), validate(updateUserSchema), c.update);
r.patch('/:id/status', authorize('hr'), validate(idParam, 'params'), validate(statusSchema), c.setStatus);
r.post('/:id/invite', authorize('hr'), validate(idParam, 'params'), c.reinvite);
export default r;
