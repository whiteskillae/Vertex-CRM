const express = require('express');
const { 
  createTask, getTasks, updateTask, submitTask, 
  bulkDeleteTasks, approveTask, reassignTask,
  softDeleteTask, restoreTask, permanentDeleteTask 
} = require('../controllers/taskController');
const { protect, admin, manager } = require('../middleware/authMiddleware');
const router = express.Router();

router.route('/')
  .post(protect, createTask)
  .get(protect, getTasks);

router.delete('/', protect, manager, bulkDeleteTasks);

// Trash management
router.put('/:id/restore', protect, manager, restoreTask);
router.delete('/:id/permanent', protect, manager, permanentDeleteTask);

router.route('/:id')
  .put(protect, updateTask)
  .delete(protect, manager, softDeleteTask);

router.post('/:id/submit', protect, submitTask);
router.post('/:id/approve', protect, manager, approveTask);
router.post('/:id/reassign', protect, manager, reassignTask);

module.exports = router;
