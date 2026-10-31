import { AppError } from '../utils/AppError.js';

// validate(schema, 'body' | 'query' | 'params'). Replaces the input with the parsed, cleaned data,
// so unknown fields are dropped (this is our protection against mass assignment).
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return next(new AppError('Validation failed', 400, details));
  }
  req[source] = result.data;
  next();
};
