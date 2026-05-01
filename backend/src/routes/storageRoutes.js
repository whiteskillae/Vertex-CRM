const express = require('express');
const { getAllFiles, deleteFile } = require('../controllers/storageController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);
router.use(admin); // Storage is strictly restricted to Admin nodes

router.get('/', getAllFiles);
router.delete('/', deleteFile);

module.exports = router;
