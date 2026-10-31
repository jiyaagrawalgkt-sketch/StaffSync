import mongoose from 'mongoose';

export const LEAVE_TYPES = ['casual', 'sick', 'earned'];
export const LEAVE_STATUSES = ['pending', 'approved', 'rejected', 'cancelled'];

const leaveSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: LEAVE_TYPES, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    year: { type: Number, required: true },
    days: { type: Number, required: true, min: 1 }, // working days only
    reason: { type: String, required: true, trim: true, minlength: 5, maxlength: 500 },
    status: { type: String, enum: LEAVE_STATUSES, default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

leaveSchema.index({ user: 1, startDate: -1 });
leaveSchema.index({ status: 1, createdAt: -1 });
leaveSchema.index({ startDate: 1, endDate: 1 });

export default mongoose.model('Leave', leaveSchema);
