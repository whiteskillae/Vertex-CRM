const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true }, // 'lead', 'task', 'user', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: Object },
  ip: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now }
});

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ entity: 1, entityId: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
