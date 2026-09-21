const Task = require('../models/Task');
const Message = require('../models/Message');
const Report = require('../models/Report');
const cloudinary = require('cloudinary').v2;

// ── FIX: Configure Cloudinary for deletion ───────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Extracts the public_id from a Cloudinary URL.
 * Example: https://res.cloudinary.com/cloud_name/image/upload/v12345/folder/public_id.jpg
 * Result: folder/public_id
 */
const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  try {
    const parts = url.split('/');
    const lastPart = parts.pop(); // public_id.jpg
    const folderParts = parts.slice(parts.indexOf('upload') + 2); // skip 'upload' and 'v12345'
    const publicIdWithExtension = [...folderParts, lastPart].join('/');
    return publicIdWithExtension.split('.')[0];
  } catch (error) {
    console.error('Error parsing Cloudinary URL:', error);
    return null;
  }
};

exports.getAllFiles = async (req, res) => {
  try {
    const files = [];

    // 1. Fetch Task Attachments
    const tasks = await Task.find({ submissionAttachment: { $exists: true, $ne: null } })
      .populate('assignedTo', 'name email')
      .select('title submissionAttachment assignedTo createdAt');
    
    tasks.forEach(t => {
      files.push({
        id: t._id,
        source: 'Task',
        sourceTitle: t.title,
        url: t.submissionAttachment,
        owner: t.assignedTo?.name || 'System',
        createdAt: t.createdAt
      });
    });

    // 2. Fetch Message Files
    const messages = await Message.find({ 
      $or: [
        { fileUrl: { $exists: true, $ne: null } },
        { voiceUrl: { $exists: true, $ne: null } }
      ]
    }).populate('senderId', 'name').select('fileUrl voiceUrl senderId createdAt');

    messages.forEach(m => {
      if (m.fileUrl) {
        files.push({
          id: m._id,
          source: 'Message',
          sourceTitle: 'Chat Attachment',
          url: m.fileUrl,
          owner: m.senderId?.name || 'Unknown',
          createdAt: m.createdAt
        });
      }
      if (m.voiceUrl) {
        files.push({
          id: m._id,
          source: 'Message',
          sourceTitle: 'Voice Recording',
          url: m.voiceUrl,
          owner: m.senderId?.name || 'Unknown',
          createdAt: m.createdAt
        });
      }
    });

    // 3. Fetch Report Files
    const reports = await Report.find({ 'files.0': { $exists: true } })
      .populate('employeeId', 'name')
      .select('title files employeeId date');

    reports.forEach(r => {
      r.files.forEach(f => {
        files.push({
          id: r._id,
          source: 'Report',
          sourceTitle: r.title,
          url: f.url,
          owner: r.employeeId?.name || 'Unknown',
          createdAt: r.date
        });
      });
    });

    // Sort by newest
    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(files);
  } catch (error) {
    console.error('getAllFiles error:', error);
    res.status(500).json({ message: 'Failed to retrieve storage data' });
  }
};

exports.deleteFile = async (req, res) => {
  try {
    const { url, source, id } = req.body;

    if (!url) return res.status(400).json({ message: 'File URL required' });

    // 1. Delete from Cloudinary
    const publicId = getPublicIdFromUrl(url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary asset deleted: ${publicId}`);
    }

    // 2. Remove references in Database
    if (source === 'Task') {
      await Task.findByIdAndUpdate(id, { $unset: { submissionAttachment: "" } });
    } else if (source === 'Message') {
      await Message.findByIdAndUpdate(id, { $unset: { fileUrl: "", voiceUrl: "" } });
    } else if (source === 'Report') {
      await Report.findByIdAndUpdate(id, { $pull: { files: { url: url } } });
    }

    res.json({ message: 'File purged from storage and Cloudinary' });
  } catch (error) {
    console.error('deleteFile error:', error);
    res.status(500).json({ message: 'Failed to delete file' });
  }
};
