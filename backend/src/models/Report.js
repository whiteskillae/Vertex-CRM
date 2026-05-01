const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, maxlength: 300, trim: true },
  content: { type: String, required: true, maxlength: 10000 },
  files: [{
    url: String,
    name: String,
    type: String // pdf, image, excel, etc.
  }],
  date: { type: Date, default: Date.now },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  workLog: [{ type: String, maxlength: 1000 }], // Structured line-by-line work items
  status: { type: String, enum: ['pending', 'done'], default: 'pending', index: true },
  isSeen: { type: Boolean, default: false, index: true }
});

// ── Index for performance ────────────────────────────────────────────────────
reportSchema.index({ employeeId: 1, date: -1 });

module.exports = mongoose.model('Report', reportSchema);
