const User = require('../models/User');
const MonitoringSession = require('../models/MonitoringSession');
const { getActiveStreamers } = require('../socket');

// Get all employees with their monitoring status
exports.getMonitoringStatus = async (req, res) => {
  try {
    const employees = await User.find({ role: 'employee' }).select('name email status jobType bio');
    const activeStreamers = getActiveStreamers();

    const statusList = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      isSharing: activeStreamers.has(emp._id.toString()),
      status: emp.status
    }));

    res.json(statusList);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get session history for an employee
exports.getSessionHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const sessions = await MonitoringSession.find({ employeeId })
      .sort({ startTime: -1 })
      .limit(10);
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Save a screenshot (Admin capability)
exports.saveScreenshot = async (req, res) => {
  try {
    const { sessionId, screenshot } = req.body;
    await MonitoringSession.findByIdAndUpdate(sessionId, { lastScreenshot: screenshot });
    res.json({ message: 'Screenshot saved successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
