const PersonalTodo = require('../models/PersonalTodo');

exports.getTodos = async (req, res) => {
  try {
    const todos = await PersonalTodo.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(todos);
  } catch (error) {
    console.error('getTodos error:', error.message);
    res.status(500).json({ message: 'Failed to fetch todos' });
  }
};

exports.addTodo = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Todo text is required' });
    }

    const todo = await PersonalTodo.create({
      text: text.trim(),
      userId: req.user.id
    });
    res.status(201).json(todo);
  } catch (error) {
    console.error('addTodo error:', error.message);
    res.status(500).json({ message: 'Failed to add todo' });
  }
};

exports.toggleTodo = async (req, res) => {
  try {
    const todo = await PersonalTodo.findOne({ _id: req.params.id, userId: req.user.id });
    if (!todo) return res.status(404).json({ message: 'Todo not found' });
    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch (error) {
    console.error('toggleTodo error:', error.message);
    res.status(500).json({ message: 'Failed to update todo' });
  }
};

exports.deleteTodo = async (req, res) => {
  try {
    const result = await PersonalTodo.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ message: 'Todo not found' });
    res.json({ message: 'Todo deleted' });
  } catch (error) {
    console.error('deleteTodo error:', error.message);
    res.status(500).json({ message: 'Failed to delete todo' });
  }
};
