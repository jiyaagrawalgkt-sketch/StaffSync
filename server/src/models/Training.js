import mongoose from 'mongoose';

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    location: { type: String, trim: true, maxlength: 120 },
    capacity: { type: Number, default: 0, min: 0 }, // 0 = unlimited
    enrolledCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

trainingSchema.index({ status: 1, startDate: 1 });
trainingSchema.index({ createdBy: 1 });

export default mongoose.model('Training', trainingSchema);
