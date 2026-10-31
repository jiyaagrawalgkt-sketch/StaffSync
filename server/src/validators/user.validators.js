import { z } from 'zod';
import { objectId, dateStr, paging } from './common.js';

const base = z.object({
  fullName: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
  employeeId: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{3,20}$/, 'Employee ID: 3-20 letters, numbers or hyphens').optional().or(z.literal('')),
  role: z.enum(['hr', 'manager', 'employee']),
  department: objectId.nullable().optional().or(z.literal('')),
  jobTitle: z.string().trim().max(80).optional(),
  manager: objectId.nullable().optional().or(z.literal('')),
  joiningDate: dateStr,
  employmentStatus: z.enum(['full-time', 'part-time', 'contract', 'intern']),
  phone: z.string().trim().regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid phone number').optional().or(z.literal('')),
});

export const createUserSchema = base.partial({ role: true, joiningDate: true, employmentStatus: true, employeeId: true });
export const updateUserSchema = base.partial();
export const statusSchema = z.object({ isActive: z.boolean() });

export const listUsersQuery = z.object({
  ...paging,
  search: z.string().trim().max(60).optional(),
  department: objectId.optional(),
  role: z.enum(['hr', 'manager', 'employee']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['name', '-name', 'joiningDate', '-joiningDate', 'employeeId']).default('name'),
});
