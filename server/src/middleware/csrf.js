import { AppError } from '../utils/AppError.js';

// CSRF defence: browsers cannot add a custom header to a cross-site form post, and our CORS
// policy blocks cross-site XHR/fetch from unknown origins. So requiring this header on every
// state-changing request proves the call came from our own JavaScript.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export function csrfGuard(req, res, next) {
  if (SAFE.has(req.method)) return next();
  if (req.get('X-Requested-With') !== 'StaffSync') {
    return next(new AppError('Missing or invalid X-Requested-With header', 403));
  }
  next();
}
