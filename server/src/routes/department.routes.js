import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { departmentSchema, updateDepartmentSchema } from '../validators/department.validators.js';
import * as c from '../controllers/department.controller.js';

const r = Router();
r.use(authenticate);
r.get('/', c.list);
r.post('/', authorize('hr'), validate(departmentSchema), c.create);
r.patch('/:id', authorize('hr'), validate(idParam, 'params'), validate(updateDepartmentSchema), c.update);
r.delete('/:id', authorize('hr'), validate(idParam, 'params'), c.remove);
export default r;
