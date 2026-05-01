const Message = require('../models/Message');
const User = require('../models/User');
const { getIO } = require('../socket');

exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message, fileUrl, fileType, voiceUrl } = req.body;

    if (!receiverId || (!message && !fileUrl && !voiceUrl)) {
      return res.status(400).json({ message: 'Receiver and content are required' });
    }

    const newMessage = await Message.create({
      senderId: req.user.id,
      receiverId,
      message,
      fileUrl,
      fileType,
      voiceUrl
    });

    const populated = await Message.findById(newMessage._id)
      .populate('senderId', 'name email role')
      .populate('receiverId', 'name email role');

    // Real-time delivery
    const io = getIO();
    io.to(receiverId.toString()).emit('new_message', populated);

    res.status(201).json(populated);
  } catch (error) {
    console.error('sendMessage error:', error.message);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { contactId } = req.query;
    let query = {
      $or: [
        { senderId: req.user.id },
        { receiverId: req.user.id }
      ],
      isDeleted: false
    };

    if (contactId) {
      query = {
        $or: [
          { senderId: req.user.id, receiverId: contactId },
          { senderId: contactId, receiverId: req.user.id }
        ],
        isDeleted: false
      };
    }

    const messages = await Message.find(query)
      .sort({ timestamp: 1 })
      .populate('senderId', 'name role')
      .populate('receiverId', 'name role');
    
    res.json(messages);
  } catch (error) {
    console.error('getMessages error:', error.message);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
};

exports.markAsSeen = async (req, res) => {
  try {
    const { contactId } = req.body;
    await Message.updateMany(
      { senderId: contactId, receiverId: req.user.id, isSeen: false },
      { isSeen: true, seenAt: Date.now() }
    );

    const io = getIO();
    io.to(contactId.toString()).emit('messages_seen', { viewerId: req.user.id });

    res.json({ message: 'Messages marked as seen' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update seen status' });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await Message.findById(req.params.id);

    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.senderId.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });
    
    // ❌ Restriction: If message is seen → cannot edit
    if (msg.isSeen) {
      return res.status(400).json({ message: 'Cannot edit a message that has already been seen' });
    }

    msg.message = content;
    msg.isEdited = true;
    await msg.save();

    const io = getIO();
    io.to(msg.receiverId.toString()).emit('message_edited', msg);

    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Failed to edit message' });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);

    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.senderId.toString() !== req.user.id) return res.status(403).json({ message: 'Unauthorized' });

    // ❌ Restriction: If message is seen → cannot delete
    if (msg.isSeen) {
      return res.status(400).json({ message: 'Cannot delete a message that has already been seen' });
    }

    msg.isDeleted = true;
    await msg.save();

    const io = getIO();
    io.to(msg.receiverId.toString()).emit('message_deleted', msg._id);

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete message' });
  }
};

exports.getContacts = async (req, res) => {
  try {
    const contacts = await User.find({ 
      _id: { $ne: req.user._id }, 
      isDeleted: { $ne: true }
    }).select('name email role status');
    
    console.log(`[DEBUG] Final contacts found: ${contacts.length}`);
    
    // Enrich with unread counts
    const enrichedContacts = await Promise.all(contacts.map(async (c) => {
      const unreadCount = await Message.countDocuments({
        senderId: c._id,
        receiverId: req.user.id,
        isSeen: false,
        isDeleted: false
      });
      return { ...c.toObject(), unreadCount };
    }));

    res.json(enrichedContacts);
  } catch (error) {
    console.error('getContacts error:', error.message);
    res.status(500).json({ message: 'Failed to fetch contacts' });
  }
};

