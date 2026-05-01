const express = require('express');
const router = express.Router();
const { getTodos, addTodo, toggleTodo, deleteTodo } = require('../controllers/todoController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getTodos);
router.post('/', protect, addTodo);
router.put('/:id', protect, toggleTodo);
router.delete('/:id', protect, deleteTodo);

module.exports = router;
