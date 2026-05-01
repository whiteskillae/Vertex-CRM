const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 100, trim: true },
  email: { type: String, required: true, unique: true, maxlength: 200, trim: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'employee'], default: 'employee', index: true },
  // ── User status for approval flow ─────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'active', 'blocked'],
    default: 'pending',
    index: true
  },
  isVerified: { type: Boolean, default: false },
  phone: { type: String, maxlength: 30 },
  jobType: { type: String, enum: ['remote', 'hybrid', 'office'], default: 'office' },
  bio: { type: String, maxlength: 1000 },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  otp: { type: String },
  otpExpires: { type: Date },
  otpAttempts: { type: Number, default: 0 },
  // ── Honor Score System ─────────────────────────────────────────────────────
  honorScore: {
    score: { type: Number, default: 50, min: 0, max: 100 },
    tasksCompleted: { type: Number, default: 0 },
    tasksOnTime: { type: Number, default: 0 },
    tasksLate: { type: Number, default: 0 },
    reportsSubmitted: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  },
  // ── Notification Tracking ──────────────────────────────────────────────────
  lastReadTasksAt: { type: Date, default: Date.now },
  lastReadAnnouncementsAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
