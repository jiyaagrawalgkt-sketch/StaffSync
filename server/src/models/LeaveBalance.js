import mongoose from 'mongoose';
import { LEAVE_TYPES } from './Leave.js';

const leaveBalanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    year: { type: Number, required: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    allocated: { type: Number, required: true, min: 0 },
    used: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ user: 1, year: 1, type: 1 }, { unique: true });

export default mongoose.model('LeaveBalance', leaveBalanceSchema);
