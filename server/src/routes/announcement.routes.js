import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { idParam } from '../validators/common.js';
import { createAnnouncementSchema, updateAnnouncementSchema, announcementQuery } from '../validators/announcement.validators.js';
import * as c from '../controllers/announcement.controller.js';

const r = Router();
r.use(authenticate);
r.get('/', validate(announcementQuery, 'query'), c.list);
r.post('/', authorize('hr'), validate(createAnnouncementSchema), c.create);
r.patch('/:id', authorize('hr'), validate(idParam, 'params'), validate(updateAnnouncementSchema), c.update);
r.post('/:id/publish', authorize('hr'), validate(idParam, 'params'), c.publish);
r.post('/:id/archive', authorize('hr'), validate(idParam, 'params'), c.archive);
export default r;
