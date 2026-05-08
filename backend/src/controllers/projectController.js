const Project = require('../models/Project');
const Task = require('../models/Task');
const { sendNotification } = require('../utils/notificationUtils');

exports.createProject = async (req, res) => {
  try {
    const { title, description, deadline, priority, clientInfo, technicalDetails, members } = req.body;

    if (!title) return res.status(400).json({ message: 'Project title is required' });

    const project = await Project.create({
      ...req.body,
      createdBy: req.user.id
    });

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project' });
  }
};

exports.getProjects = async (req, res) => {
  try {
    const { status, trash } = req.query;
    let filter = { isDeleted: trash === 'true' };
    if (status) filter.status = status;

    if (req.user.role === 'employee') {
      filter.members = req.user.id;
      filter.isDeleted = false;
    }

    const projects = await Project.find(filter)
      .sort({ updatedAt: -1 })
      .populate('members', 'name email role')
      .populate('createdBy', 'name email');

    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('members', 'name email role')
      .populate('createdBy', 'name email');
    
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Fetch related tasks
    const tasks = await Task.find({ projectId: project._id, isDeleted: false })
      .populate('assignedTo', 'name email');

    res.json({ project, tasks });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project details' });
  }
};

exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project' });
  }
};

exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, { isDeleted: true }, { new: true });
    res.json({ message: 'Project moved to archive', project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project' });
  }
};

exports.getProjectStats = async (req, res) => {
  try {
    const stats = await Project.aggregate([
      { $match: { isDeleted: false } },
      { $group: {
          _id: '$status',
          count: { $sum: 1 }
      }}
    ]);

    const total = await Project.countDocuments({ isDeleted: false });
    const overdue = await Project.countDocuments({ 
      isDeleted: false, 
      deadline: { $lt: new Date() },
      status: { $nin: ['completed', 'archived'] }
    });

    res.json({ stats, total, overdue });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch project stats' });
  }
};
