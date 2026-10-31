import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as c from '../controllers/auth.controller.js';
import { loginSchema, setupSchema, acceptInviteSchema, changePasswordSchema, updateMeSchema } from '../validators/auth.validators.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: env.isTest ? 10000 : 20, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in a few minutes.' },
});

const r = Router();
r.get('/setup-status', c.setupStatus);
r.post('/setup', authLimiter, validate(setupSchema), c.setup);
r.post('/login', authLimiter, validate(loginSchema), c.login);
r.post('/accept-invite', authLimiter, validate(acceptInviteSchema), c.acceptInvite);
r.post('/logout', c.logout);
r.get('/me', authenticate, c.me);
r.patch('/me', authenticate, validate(updateMeSchema), c.updateMe);
r.post('/change-password', authenticate, authLimiter, validate(changePasswordSchema), c.changePassword);
export default r;
export { c as authController };
