const express = require('express');
const { createVaultEntry, getVaultEntries, deleteVaultEntry } = require('../controllers/vaultController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);
router.use(adminOnly); // Strict admin access

router.route('/')
  .post(createVaultEntry)
  .get(getVaultEntries);

router.delete('/:id', deleteVaultEntry);

module.exports = router;
