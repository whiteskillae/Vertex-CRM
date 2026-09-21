const express = require('express');
const router = express.Router();
const { createAnnouncement, getAnnouncements, deleteAnnouncement, markAnnouncementAsSeen } = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', createAnnouncement);
router.get('/', getAnnouncements);
router.put('/:id/seen', markAnnouncementAsSeen);
router.delete('/:id', deleteAnnouncement);

module.exports = router;
