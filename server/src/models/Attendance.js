import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    workDate: { type: String, required: true }, // YYYY-MM-DD in organisation timezone
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, default: null },
    status: { type: String, enum: ['present', 'late'], required: true },
    workMinutes: { type: Number, min: 0 },
  },
  { timestamps: true }
);

// The database itself guarantees one record per person per day, even under concurrent requests.
attendanceSchema.index({ user: 1, workDate: 1 }, { unique: true });
attendanceSchema.index({ workDate: 1 });

export default mongoose.model('Attendance', attendanceSchema);
