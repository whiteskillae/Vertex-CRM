const Notification = require('../models/Notification');
const { getIO } = require('../socket');

/**
 * Creates a notification in DB and emits via socket.io
 */
const sendNotification = async ({ recipient, sender, type, title, message, link }) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      link
    });

    const io = getIO();
    io.to(recipient.toString()).emit('notification', notification);
    
    return notification;
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
};

module.exports = { sendNotification };
