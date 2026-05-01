const mongoose = require('mongoose');

const calendarNoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true }, // Format: YYYY-MM-DD
  type: { type: String, enum: ['work', 'todo', 'note', 'alert', 'deadline'], default: 'note' },
  isPersonal: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CalendarNote', calendarNoteSchema);
