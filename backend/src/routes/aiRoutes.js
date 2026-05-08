const express = require('express');
const { chatWithAI, streamChatWithAI } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);

router.post('/chat', chatWithAI);
router.post('/stream', streamChatWithAI);

module.exports = router;
