import { z } from 'zod';
import { objectId, paging } from './common.js';

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(3).max(2000),
  targetDepartments: z.array(objectId).max(50).default([]),
});
export const updateAnnouncementSchema = createAnnouncementSchema.partial();
export const announcementQuery = z.object({ ...paging, status: z.enum(['draft', 'published', 'archived']).optional() });
