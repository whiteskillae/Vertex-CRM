const express = require('express');
const { 
  submitReport, getReports, deleteReport, deleteReportFile, 
  bulkDeleteReports, markReportAsDone, markReportAsSeen 
} = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .post(protect, submitReport)
  .get(protect, getReports)
  .delete(protect, bulkDeleteReports);

router.post('/delete-file', protect, deleteReportFile);
router.patch('/:id/done', protect, admin, markReportAsDone);
router.patch('/:id/seen', protect, admin, markReportAsSeen);
router.delete('/:id', protect, deleteReport);

module.exports = router;
