import { z } from 'zod';
import { objectId, dateStr, paging } from './common.js';

export const notificationQuery = z.object({ ...paging, unread: z.enum(['true', 'false']).optional() });
export const reportQuery = z.object({ from: dateStr.optional(), to: dateStr.optional(), department: objectId.optional() });
