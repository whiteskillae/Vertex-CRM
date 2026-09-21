const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  action: { type: String, required: true }, // e.g., 'login', 'logout', 'view_page', 'update_lead'
  actionType: { type: String, enum: ['auth', 'view', 'create', 'update', 'delete', 'system'], default: 'view' },
  entity: { type: String }, // 'lead', 'task', 'user', etc.
  entityId: { type: mongoose.Schema.Types.ObjectId },
  page: { type: String }, // URL or Page Name
  details: { type: String }, // Description of action
  changes: { type: Object }, // Before/After state if applicable
  
  // Device & Network info
  ip: { type: String },
  userAgent: { type: String },
  device: { type: String }, // e.g., 'Mobile', 'Desktop'
  browser: { type: String },
  os: { type: String },
  
  timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ actionType: 1, timestamp: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
