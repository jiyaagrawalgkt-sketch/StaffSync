import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, maxlength: 10, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

export default mongoose.model('Department', departmentSchema);
