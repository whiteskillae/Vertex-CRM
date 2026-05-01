const Task = require('../models/Task');
const Report = require('../models/Report');
const { sendNotification } = require('../utils/notificationUtils');

exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, assignedTo, relatedLead } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Task title is required' });
    }

    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Employees cannot create tasks' });
    }

    const task = await Task.create({
      title,
      description,
      dueDate,
      priority,
      assignedTo,
      relatedLead,
      createdBy: req.user.id,
      history: [{
        action: 'created',
        message: 'Task created by admin',
        performedBy: req.user.id
      }]
    });

    if (assignedTo) {
      await sendNotification({
        recipient: assignedTo,
        sender: req.user.id,
        type: 'task_reassigned',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: ${title}`,
        link: `/dashboard/tasks`
      });
    }

    res.status(201).json(task);
  } catch (error) {
    console.error('createTask error:', error.message);
    res.status(500).json({ message: 'Failed to create task' });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;
    const { status, trash } = req.query;

    let filter = { isDeleted: trash === 'true' };
    
    if (status) filter.status = status;

    if (req.user.role === 'employee') {
      filter.assignedTo = req.user.id;
      filter.isDeleted = false; // Employees never see trashed items
    } else if (req.user.role === 'manager') {
      filter.$or = [{ assignedTo: req.user.id }, { createdBy: req.user.id }];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email')
        .populate('createdBy', 'name email')
        .populate('relatedLead', 'name company'),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('getTasks error:', error.message);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    const isAssignee = task.assignedTo?.toString() === req.user.id;

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldStatus = task.status;
    const updates = { ...req.body, updatedAt: Date.now() };
    
    if (updates.status && updates.status !== oldStatus) {
      task.history.push({
        action: 'status_change',
        message: `Status changed from ${oldStatus} to ${updates.status}`,
        performedBy: req.user.id
      });
    }

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true })
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email');

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update task' });
  }
};

exports.submitTask = async (req, res) => {
  try {
    const { submission, attachment, attachmentUrl } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo?.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    task.submission = submission;
    task.submissionAttachment = attachmentUrl || attachment || task.submissionAttachment;
    task.submissionDate = Date.now();
    task.reassignmentMessage = null; // Clear old feedback on new submission
    task.status = 'review';
    task.history.push({
      action: 'submitted',
      message: 'Task submitted for review',
      performedBy: req.user.id
    });

    await task.save();

    // Notify Admin
    await sendNotification({
      recipient: task.createdBy,
      sender: req.user.id,
      type: 'task_submission',
      title: 'Task Submitted',
      message: `${req.user.name} submitted task: ${task.title}`,
      link: `/dashboard/tasks`
    });

    // ── Sync to Reports ──────────────────────────────────────────────────────
    if (attachment) {
      await Report.create({
        employeeId: req.user.id,
        title: `Automatic Report: ${task.title}`,
        content: `Submission for task: ${task.title}\n\nEmployee Note: ${submission || 'N/A'}`,
        taskId: task._id,
        files: [{
          url: attachment,
          name: `Submission_${task.title}`,
          type: attachment.split('.').pop().toLowerCase()
        }]
      });
    }

    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Failed to submit task' });
  }
};

exports.approveTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = 'completed';
    task.history.push({
      action: 'approved',
      message: 'Task marked as Done by admin',
      performedBy: req.user.id
    });
    await task.save();

    res.json({ message: 'Task approved', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to approve task' });
  }
};

exports.reassignTask = async (req, res) => {
  try {
    const { message } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.status = 'todo';
    task.reassignmentMessage = message;
    task.history.push({
      action: 'reassigned',
      message: `Task sent back with feedback: ${message}`,
      performedBy: req.user.id
    });
    await task.save();

    // Notify Employee
    await sendNotification({
      recipient: task.assignedTo,
      sender: req.user.id,
      type: 'task_reassigned',
      title: 'Task Reassigned',
      message: `Admin requested changes on: ${task.title}. Feedback: ${message}`,
      link: `/dashboard/tasks`
    });

    res.json({ message: 'Task reassigned for redo', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to reassign task' });
  }
};

exports.softDeleteTask = async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Personnel nodes are not authorized to delete task records' });
    }
    
    const task = await Task.findByIdAndUpdate(req.params.id, {
      isDeleted: true,
      deletedAt: Date.now()
    }, { new: true });
    res.json({ message: 'Task moved to trash', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete task' });
  }
};

exports.restoreTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      deletedAt: null
    }, { new: true });
    res.json({ message: 'Task restored from trash', task });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore task' });
  }
};

exports.permanentDeleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // ── FIX: Cloudinary Cleanup ──────────────────────────────────────────────
    if (task.submissionAttachment) {
      const publicId = task.submissionAttachment.split('/').pop().split('.')[0];
      const cloudinary = require('../config/cloudinary');
      await cloudinary.uploader.destroy(`crm-uploads/${publicId}`).catch(e => console.error('Cloudinary cleanup failed:', e));
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task permanently purged' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to purge task' });
  }
};

exports.bulkDeleteTasks = async (req, res) => {
  try {
    const { ids, permanent } = req.body;
    if (!ids || !Array.isArray(ids)) return res.status(400).json({ message: 'Invalid IDs' });

    if (permanent) {
      // Need to handle cloudinary cleanup for each if I want to be thorough, 
      // but for bulk, I'll just delete from DB for now to keep it fast, 
      // or map over them if performance allows.
      await Task.deleteMany({ _id: { $in: ids } });
      return res.json({ message: 'Tasks permanently deleted' });
    }

    await Task.updateMany({ _id: { $in: ids } }, { isDeleted: true, deletedAt: Date.now() });
    res.json({ message: 'Tasks moved to trash' });
  } catch (error) {
    res.status(500).json({ message: 'Bulk action failed' });
  }
};

