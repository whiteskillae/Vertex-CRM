const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, maxlength: 200, trim: true },
  description: { type: String, maxlength: 5000, trim: true },
  dueDate: { type: Date },
  status: {
    type: String,
    // ── FIX: Added 'review' status for multi-phase task workflow ─────────
    enum: ['todo', 'in-progress', 'review', 'completed', 'cancelled'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  relatedLead: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
  submission: { type: String, maxlength: 10000 },
  submissionAttachment: { type: String }, // Cloudinary URL
  submissionDate: { type: Date },
  reassignmentMessage: { type: String, maxlength: 1000 },
  history: [{
    action: String,
    message: String,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  isDeleted: { type: Boolean, default: false, index: true },
  deletedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ── FIX: Index on status and isDeleted for performance ───────────────────────
taskSchema.index({ status: 1, isDeleted: 1 });
taskSchema.index({ assignedTo: 1, status: 1, isDeleted: 1 });

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Task', taskSchema);
