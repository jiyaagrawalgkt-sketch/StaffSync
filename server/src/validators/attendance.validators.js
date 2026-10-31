import { z } from 'zod';
import { objectId, dateStr, paging } from './common.js';

export const attendanceQuery = z.object({
  ...paging,
  user: objectId.optional(),
  from: dateStr.optional(),
  to: dateStr.optional(),
});
