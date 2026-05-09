const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const { userId, actionType, search } = req.query;

    let query = {};
    if (userId) query.user = userId;
    if (actionType) query.actionType = actionType;
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { details: { $regex: search, $options: 'i' } },
        { page: { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await ActivityLog.find(query)
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    const total = await ActivityLog.countDocuments(query);

    res.json({
      logs,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

module.exports = router;
