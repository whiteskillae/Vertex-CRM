const express = require('express');
const { sendMessage, getMessages, getContacts, markAsSeen, editMessage, deleteMessage } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// ── Diagnostic Logging ───────────────────────────────────────────────────────
router.use((req, res, next) => {
  console.log(`[Message Route] ${req.method} ${req.url}`);
  next();
});

router.use(protect);

// ── Base Routes ──────────────────────────────────────────────────────────────
router.route('/')
  .post(sendMessage) // This handles POST /api/messages
  .get(getMessages);  // This handles GET /api/messages

// ── Specific Operations ──────────────────────────────────────────────────────
router.get('/contacts', getContacts);
router.post('/mark-seen', markAsSeen);
router.put('/seen', markAsSeen); // Support both for legacy sync

// ── Message Management ───────────────────────────────────────────────────────
router.put('/:id', editMessage);
router.delete('/:id', deleteMessage);

module.exports = router;
