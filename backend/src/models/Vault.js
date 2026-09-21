const mongoose = require('mongoose');

const vaultSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['credential', 'private_note', 'api_key', 'other'],
    default: 'credential' 
  },
  content: { type: String, required: true }, // Encrypted
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Vault', vaultSchema);
