const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'testing', 'completed', 'maintenance', 'archived'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  deadline: { type: Date },
  maintenanceDate: { type: Date },
  clientInfo: {
    name: String,
    email: String,
    phone: String,
    company: String
  },
  documentation: { type: String }, // Long text documentation
  attachments: [{
    name: String,
    url: String,
    type: String, // 'pdf', 'image', etc.
    uploadedAt: { type: Date, default: Date.now }
  }],
  notes: { type: String },
  technicalDetails: { type: String },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  startDate: { type: Date },
  workflow: [{
    employeeName: String,
    taskName: String
  }],
  progress: { type: Number, default: 0, min: 0, max: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Project', projectSchema);
