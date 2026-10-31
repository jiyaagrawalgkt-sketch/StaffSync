import mongoose from 'mongoose';

export const ROLES = ['hr', 'manager', 'employee'];

// One collection holds both the login account and the HR profile (see docs for the reasoning).
const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true, maxlength: 20 },
    passwordHash: { type: String, select: false },
    role: { type: String, enum: ROLES, default: 'employee', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    jobTitle: { type: String, trim: true, maxlength: 80 },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    joiningDate: { type: String, required: true }, // YYYY-MM-DD
    employmentStatus: { type: String, enum: ['full-time', 'part-time', 'contract', 'intern'], default: 'full-time' },
    phone: { type: String, trim: true, maxlength: 20 },
    isActive: { type: Boolean, default: true },
    activated: { type: Boolean, default: false }, // true once a password has been set
    passwordChangedAt: Date,
    inviteTokenHash: { type: String, select: false },
    inviteExpires: { type: Date, select: false },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ manager: 1 });
userSchema.index({ department: 1, isActive: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ fullName: 1 });

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    delete ret.inviteTokenHash;
    delete ret.inviteExpires;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model('User', userSchema);
