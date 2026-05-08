const express = require('express');
const { 
  createProject, getProjects, getProjectById, updateProject, deleteProject, getProjectStats 
} = require('../controllers/projectController');
const { protect, adminOnly } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);

router.get('/stats', adminOnly, getProjectStats);

router.route('/')
  .post(adminOnly, createProject)
  .get(getProjects);

router.route('/:id')
  .get(getProjectById)
  .put(adminOnly, updateProject)
  .delete(adminOnly, deleteProject);

module.exports = router;
