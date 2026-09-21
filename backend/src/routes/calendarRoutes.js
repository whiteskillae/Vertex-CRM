const express = require('express');
const router = express.Router();
const { createNote, getNotes } = require('../controllers/calendarController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, createNote);
router.get('/', protect, getNotes);

module.exports = router;
