const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const authRoutes = require('./routes/auth');
const foodRoutes = require('./routes/food');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');
const socketHandler = require('./socket/socketHandler');
const { setSocketServer } = require('./utils/notificationService');
const { startAutoDowngradeCron } = require('./utils/cronJob');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  }
});

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      uptime: process.uptime()
    },
    message: 'FoodBridge API is healthy'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    data: {},
    message: 'Route not found'
  });
});

app.use((error, req, res, next) => {
  return res.status(500).json({
    success: false,
    data: {},
    message: error.message || 'Unexpected server error'
  });
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    socketHandler(io);
    setSocketServer(io);
    startAutoDowngradeCron();

    const port = process.env.PORT || 5000;
    server.listen(port, () => {
      console.log(`FoodBridge backend running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server', error);
    process.exit(1);
  }
};

startServer();

