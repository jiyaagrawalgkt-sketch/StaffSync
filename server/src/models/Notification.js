import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['leave', 'announcement', 'training', 'system'], required: true },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, maxlength: 300 },
    link: { type: String, maxlength: 120 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
