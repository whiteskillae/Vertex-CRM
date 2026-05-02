const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/status', protect, adminOnly, monitoringController.getMonitoringStatus);
router.get('/history/:employeeId', protect, adminOnly, monitoringController.getSessionHistory);
router.post('/screenshot', protect, adminOnly, monitoringController.saveScreenshot);

module.exports = router;
