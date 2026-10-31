import Department from '../models/Department.js';
import User from '../models/User.js';
import Announcement from '../models/Announcement.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/response.js';

export const list = asyncHandler(async (req, res) => {
  const [departments, counts] = await Promise.all([
    Department.find().sort({ name: 1 }).lean(),
    User.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$department', c: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.c]));
  ok(res, departments.map((d) => ({ ...d, employeeCount: map.get(String(d._id)) || 0 })));
});

export const create = asyncHandler(async (req, res) => ok(res, await Department.create(req.body), 'Department created', 201));

export const update = asyncHandler(async (req, res) => {
  const d = await Department.findById(req.params.id);
  if (!d) throw new AppError('Department not found', 404);
  d.set(req.body);
  await d.save();
  ok(res, d, 'Department updated');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (await User.exists({ department: id })) throw new AppError('Cannot delete a department that still has employees', 409);
  if (await Announcement.exists({ targetDepartments: id })) throw new AppError('Cannot delete a department used by announcements', 409);
  const d = await Department.findByIdAndDelete(id);
  if (!d) throw new AppError('Department not found', 404);
  ok(res, null, 'Department deleted');
});
