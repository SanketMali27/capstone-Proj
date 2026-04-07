const jwt = require('jsonwebtoken');

const ROLE_ROOM_MAP = {
  ngo: 'ngo-room',
  animal_husbandry: 'animal-room',
  industry: 'industry-room'
};

const socketHandler = (io) => {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Unauthorized socket connection'));
    }
  });

  io.on('connection', (socket) => {
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    if (socket.user?.role && ROLE_ROOM_MAP[socket.user.role]) {
      socket.join(ROLE_ROOM_MAP[socket.user.role]);
    }

    socket.on('disconnect', () => {
      socket.removeAllListeners();
    });
  });
};

module.exports = socketHandler;

