import { z } from 'zod';
import { paging } from './common.js';

const base = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(2000),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().trim().max(120).optional(),
  capacity: z.number().int().min(0).max(10000).default(0),
});
const endAfterStart = (d) => !d.startDate || !d.endDate || d.endDate >= d.startDate;

export const createTrainingSchema = base.refine(endAfterStart, { message: 'End must not be before start', path: ['endDate'] });
export const updateTrainingSchema = base.partial().refine(endAfterStart, { message: 'End must not be before start', path: ['endDate'] });
export const trainingQuery = z.object({ ...paging, status: z.enum(['draft', 'published', 'archived']).optional() });
