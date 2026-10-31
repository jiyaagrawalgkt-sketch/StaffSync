import { z } from 'zod';
import { objectId, dateStr, paging } from './common.js';

export const applyLeaveSchema = z
  .object({
    type: z.enum(['casual', 'sick', 'earned']),
    startDate: dateStr,
    endDate: dateStr,
    reason: z.string().trim().min(5, 'Please give a reason (at least 5 characters)').max(500),
  })
  .refine((d) => d.endDate >= d.startDate, { message: 'End date cannot be before start date', path: ['endDate'] });

export const rejectLeaveSchema = z.object({ reason: z.string().trim().min(3, 'A rejection reason is required').max(300) });

export const leaveListQuery = z.object({
  ...paging,
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled']).optional(),
  type: z.enum(['casual', 'sick', 'earned']).optional(),
  user: objectId.optional(),
});

export const calendarQuery = z.object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Use YYYY-MM') });
export const balanceQuery = z.object({ user: objectId.optional(), year: z.coerce.number().int().min(2000).max(2100).optional() });
export const adjustBalanceSchema = z.object({
  user: objectId,
  year: z.number().int().min(2000).max(2100),
  type: z.enum(['casual', 'sick', 'earned']),
  allocated: z.number().min(0).max(365),
});
