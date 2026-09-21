const mongoose = require('mongoose');

const monitoringSessionSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'interrupted'],
    default: 'active'
  },
  activityLogs: [{
    timestamp: { type: Date, default: Date.now },
    type: { type: String, enum: ['active', 'idle', 'disconnected', 'reconnected'] },
    metadata: { type: Object }
  }],
  lastScreenshot: {
    type: String // URL or Base64
  },
  duration: {
    type: Number // in seconds
  }
}, { timestamps: true });

module.exports = mongoose.model('MonitoringSession', monitoringSessionSchema);
