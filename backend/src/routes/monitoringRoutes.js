const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/status', protect, admin, monitoringController.getMonitoringStatus);
router.get('/history/:employeeId', protect, admin, monitoringController.getSessionHistory);
router.post('/screenshot', protect, admin, monitoringController.saveScreenshot);

module.exports = router;
