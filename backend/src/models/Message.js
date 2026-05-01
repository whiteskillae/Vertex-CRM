const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String },
  fileUrl: { type: String },
  fileType: { type: String }, // 'image', 'pdf', 'excel', 'doc'
  voiceUrl: { type: String },
  isSeen: { type: Boolean, default: false },
  seenAt: { type: Date },
  isDeleted: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now },
});

messageSchema.index({ senderId: 1, receiverId: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
