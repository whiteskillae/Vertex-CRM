const express = require('express');
const { createLead, getLeads, getLeadById, updateLead, deleteLead } = require('../controllers/leadController');
const { protect, admin, manager } = require('../middleware/authMiddleware');
const logActivity = require('../middleware/activityLogger');
const router = express.Router();
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// ── Role guard: employees CANNOT access leads at all ─────────────────────────
const blockEmployee = (req, res, next) => {
  if (req.user && req.user.role === 'employee') {
    return res.status(403).json({ message: 'Employees do not have access to the leads module.' });
  }
  next();
};

router.route('/')
  .post(protect, blockEmployee, logActivity('create', 'lead'), createLead)
  .get(protect, blockEmployee, getLeads);

// XLSX bulk import — admin/manager only
router.post(
  '/import',
  protect,
  manager,
  upload.single('file'),
  logActivity('import', 'lead'),
  require('../controllers/leadController').importLeads
);

router.route('/:id')
  .get(protect, blockEmployee, getLeadById)
  .put(protect, blockEmployee, logActivity('update', 'lead'), updateLead)
  .delete(protect, admin, logActivity('delete', 'lead'), deleteLead);

module.exports = router;
