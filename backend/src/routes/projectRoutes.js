const express = require('express');
const { 
  createProject, getProjects, getProjectById, updateProject, deleteProject, getProjectStats 
} = require('../controllers/projectController');
const { protect, admin } = require('../middleware/authMiddleware');
const router = express.Router();

router.use(protect);

router.get('/stats', admin, getProjectStats);

router.route('/')
  .post(admin, createProject)
  .get(getProjects);

router.route('/:id')
  .get(getProjectById)
  .put(admin, updateProject)
  .delete(admin, deleteProject);

module.exports = router;
