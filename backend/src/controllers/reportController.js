const Report = require('../models/Report');
const Task = require('../models/Task');
const User = require('../models/User');
const mongoose = require('mongoose');
const cloudinary = require('../config/cloudinary');
const { getIO } = require('../socket');

exports.submitReport = async (req, res) => {
  try {
    const { title, content, files, taskId, workLog } = req.body;
    
    // Validate taskId if present to prevent casting errors (fixes 500 error)
    if (taskId && !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(400).json({ message: 'Invalid Task ID provided' });
    }

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const cleanTaskId = (taskId && mongoose.Types.ObjectId.isValid(taskId)) ? taskId : null;

    const report = await Report.create({
      employeeId: req.user.id,
      title,
      content,
      files: Array.isArray(files) ? files : [],
      taskId: cleanTaskId,
      workLog: Array.isArray(workLog) ? workLog : []
    });

    if (cleanTaskId) {
      await Task.findByIdAndUpdate(cleanTaskId, {
        status: 'review',
        updatedAt: Date.now()
      });
    }

    const populated = await Report.findById(report._id)
      .populate('employeeId', 'name email')
      .populate('taskId', 'title');

    // ── FIX: Notify admins/managers via Socket.io ────────────────────────────
    try {
      const io = getIO();
      io.emit('task_submission', populated);
    } catch (err) {
      console.warn('Socket notification skipped:', err.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    console.error('submitReport error:', error.message);
    res.status(500).json({ message: 'Failed to submit report' });
  }
};

exports.getReports = async (req, res) => {
  try {
    // ── Pagination ───────────────────────────────────────────────────────────
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    let filter = {};
    if (req.user.role === 'employee') {
      filter = { employeeId: req.user.id };
    } else if (req.user.role === 'manager') {
      const employees = await User.find({ managerId: req.user.id }).select('_id');
      const employeeIds = employees.map(e => e._id);
      filter = { employeeId: { $in: [...employeeIds, req.user.id] } };
    }
    // Admin sees all (empty filter)
    
    // ── Apply Status Filters ────────────────────────────────────────────────
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.isSeen !== undefined) {
      filter.isSeen = req.query.isSeen === 'true';
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .populate('employeeId', 'name email')
        .populate('taskId', 'title'),
      Report.countDocuments(filter)
    ]);

    res.json({
      reports,
      page,
      pages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    console.error('getReports error:', error.message);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
};

// ── Helper: Extract Cloudinary public_id from URL ────────────────────────────
function extractPublicId(url) {
  try {
    // Cloudinary URLs look like: https://res.cloudinary.com/{cloud}/image/upload/v123/folder/filename.ext
    const parts = url.split('/upload/');
    if (parts.length < 2) return null;
    const pathWithVersion = parts[1]; // e.g. "v123/crm_reports/abc123.pdf"
    // Remove version prefix if present
    const withoutVersion = pathWithVersion.replace(/^v\d+\//, '');
    // Remove file extension
    return withoutVersion.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}

exports.deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Only the author or admin can delete
    if (report.employeeId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this report' });
    }

    // ── FIX: Clean up Cloudinary files when deleting a report ────────────────
    if (report.files && report.files.length > 0) {
      const deletePromises = report.files.map(file => {
        const publicId = extractPublicId(file.url);
        if (publicId) {
          return cloudinary.uploader.destroy(publicId).catch(err => {
            console.error(`Failed to delete Cloudinary asset ${publicId}:`, err.message);
          });
        }
        return Promise.resolve();
      });
      await Promise.allSettled(deletePromises);
    }

    await Report.findByIdAndDelete(req.params.id);
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('deleteReport error:', error.message);
    res.status(500).json({ message: 'Failed to delete report' });
  }
};

exports.deleteReportFile = async (req, res) => {
  try {
    const { reportId, fileUrl } = req.body;

    if (!reportId || !fileUrl) {
      return res.status(400).json({ message: 'Report ID and file URL are required' });
    }

    const report = await Report.findById(reportId);
    if (!report) return res.status(404).json({ message: 'Report not found' });

    // Authorization
    if (report.employeeId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // ── FIX: Clean up the specific Cloudinary file ───────────────────────────
    const publicId = extractPublicId(fileUrl);
    if (publicId) {
      try {
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.error(`Failed to delete Cloudinary asset ${publicId}:`, err.message);
      }
    }

    report.files = report.files.filter(f => f.url !== fileUrl);
    await report.save();

    res.json({ message: 'Artifact purged from intelligence record', files: report.files });
  } catch (error) {
    console.error('deleteReportFile error:', error.message);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};

// ── Bulk Delete Reports ──────────────────────────────────────────────────────
exports.bulkDeleteReports = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Provide an array of report IDs' });
    }

    let filter = { _id: { $in: ids } };
    if (req.user.role === 'employee') {
      filter.employeeId = req.user.id;
    } else if (req.user.role === 'manager') {
      const User = require('../models/User');
      const employees = await User.find({ managerId: req.user.id }).select('_id');
      const employeeIds = employees.map(e => e._id);
      filter.employeeId = { $in: [...employeeIds, req.user.id] };
    }

    // Clean up Cloudinary files for all matched reports
    const reports = await Report.find(filter);
    
    for (const report of reports) {
      if (report.files && report.files.length > 0) {
        const deletePromises = report.files.map(file => {
          const publicId = extractPublicId(file.url);
          if (publicId) {
            return cloudinary.uploader.destroy(publicId).catch(err => {
              console.error(`Failed to delete Cloudinary asset ${publicId}:`, err.message);
            });
          }
          return Promise.resolve();
        });
        await Promise.allSettled(deletePromises);
      }
    }

    const result = await Report.deleteMany(filter);
    res.json({ message: `${result.deletedCount} reports purged`, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('bulkDeleteReports error:', error.message);
    res.status(500).json({ message: 'Bulk delete failed' });
  }
};

// ── Status Updates ──────────────────────────────────────────────────────────
exports.markReportAsDone = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { status: 'done' }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update report status' });
  }
};

exports.markReportAsSeen = async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, { isSeen: true }, { new: true });
    if (!report) return res.status(404).json({ message: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: 'Failed to mark report as seen' });
  }
};
