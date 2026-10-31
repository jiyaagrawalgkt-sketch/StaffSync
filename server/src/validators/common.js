import { z } from 'zod';
import { isValidDateStr } from '../utils/dates.js';

export const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
export const idParam = z.object({ id: objectId });
export const dateStr = z.string().refine(isValidDateStr, 'Use a valid date in YYYY-MM-DD format');
export const paging = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
};
