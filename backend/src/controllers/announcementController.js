const Announcement = require('../models/Announcement');

exports.createAnnouncement = async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Only admins/managers can create announcements' });
    }
    const { title, content, priority } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }
    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'normal',
      createdBy: req.user.id
    });
    const populated = await Announcement.findById(announcement._id).populate('createdBy', 'name');
    res.status(201).json(populated);
  } catch (error) {
    console.error('createAnnouncement error:', error.message);
    res.status(500).json({ message: 'Failed to create announcement' });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name');
    res.json(announcements);
  } catch (error) {
    console.error('getAnnouncements error:', error.message);
    res.status(500).json({ message: 'Failed to fetch announcements' });
  }
};

exports.deleteAnnouncement = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });
    if (req.user.role === 'employee') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    console.error('deleteAnnouncement error:', error.message);
    res.status(500).json({ message: 'Failed to delete announcement' });
  }
};

exports.markAnnouncementAsSeen = async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });

    if (!ann.seenBy.includes(req.user.id)) {
      ann.seenBy.push(req.user.id);
      await ann.save();
    }

    res.json({ message: 'Marked as seen', seenCount: ann.seenBy.length });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update seen status' });
  }
};

