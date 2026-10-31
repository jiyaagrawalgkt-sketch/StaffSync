import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema(
  {
    training: { type: mongoose.Schema.Types.ObjectId, ref: 'Training', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

enrollmentSchema.index({ training: 1, user: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('TrainingEnrollment', enrollmentSchema);
