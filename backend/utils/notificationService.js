const Notification = require('../models/Notification');

let ioInstance = null;

const setSocketServer = (io) => {
  ioInstance = io;
};

const emitToUser = (userId, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`user:${userId}`).emit('notification', payload);
};

const emitToRoleRoom = (room, payload) => {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(room).emit('listing:update', payload);
};

const createNotification = async ({ recipientId, recipientRole, type, message, foodListingId }) => {
  const notification = await Notification.create({
    recipientId,
    recipientRole,
    type,
    message,
    foodListingId
  });

  emitToUser(String(recipientId), notification);
  return notification;
};

module.exports = {
  setSocketServer,
  emitToUser,
  emitToRoleRoom,
  createNotification
};

