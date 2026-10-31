import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createTrainingSchema, updateTrainingSchema, trainingQuery } from '../validators/training.validators.js';
import * as c from '../controllers/training.controller.js';

const r = Router();
r.use(authenticate);
r.get('/', validate(trainingQuery, 'query'), c.list);
r.get('/mine', c.mine);
r.post('/', authorize('hr', 'manager'), validate(createTrainingSchema), c.create);
r.patch('/:id', authorize('hr', 'manager'), validate(idParam, 'params'), validate(updateTrainingSchema), c.update);
r.post('/:id/publish', authorize('hr', 'manager'), validate(idParam, 'params'), c.publish);
r.post('/:id/archive', authorize('hr', 'manager'), validate(idParam, 'params'), c.archive);
r.get('/:id/enrollees', authorize('hr', 'manager'), validate(idParam, 'params'), c.enrollees);
r.post('/:id/enroll', validate(idParam, 'params'), c.enroll);
r.delete('/:id/enroll', validate(idParam, 'params'), c.cancelEnrollment);
export default r;
