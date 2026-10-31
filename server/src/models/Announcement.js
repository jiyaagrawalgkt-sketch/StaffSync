import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    body: { type: String, required: true, trim: true, minlength: 3, maxlength: 2000 },
    // Empty array = whole organisation
    targetDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

announcementSchema.index({ status: 1, publishedAt: -1 });

export default mongoose.model('Announcement', announcementSchema);
