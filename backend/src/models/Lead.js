const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 200, trim: true },
  email: { type: String, required: true, maxlength: 200, trim: true, lowercase: true },
  phone: { type: String, maxlength: 30 },
  company: { type: String, maxlength: 200, trim: true },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'closed', 'lost'],
    default: 'new'
  },
  source: { type: String, maxlength: 100 },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  notes: [{
    text: { type: String, maxlength: 2000 },
    date: { type: Date, default: Date.now },
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// ── Indexes for performance ──────────────────────────────────────────────────
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1, status: 1 });

leadSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Lead', leadSchema);
