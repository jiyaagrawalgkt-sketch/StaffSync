import { z } from 'zod';

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{2,10}$/, 'Code: 2-10 letters or numbers'),
  description: z.string().trim().max(300).optional(),
});
export const updateDepartmentSchema = departmentSchema.partial();
