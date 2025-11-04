require('dotenv').config();
require('./src/startup/logging')();

const express = require('express');
const session = require('express-session');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { connectDB } = require('./src/config/database');
const { logger } = require('./src/helpers/logger.helper');
const authMiddleware = require('./src/middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 3001;

connectDB().then(() => {
  logger.info('Database connected');
}).catch((error) => {
  logger.error('Database connection failed:', error);
  process.exit(1);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
});
app.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'dashboard/public')));

const authRoutes = require('./src/routes/auth');
const accountRoutes = require('./src/routes/accounts');
const BotManagerService = require('./src/services/bot-manager.service');

app.use('/api/auth', authRoutes);
app.use('/api/accounts', authMiddleware, accountRoutes);

BotManagerService.setIO(io);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/register.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/dashboard.html'));
});

io.use((socket, next) => sessionMiddleware(socket.request, {}, next));

const userConnections = {};

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  socket.on('register-user', (userId) => {
    userConnections[userId] = socket.id;
    BotManagerService.registerUserSession(userId, socket.id);
  });

  socket.on('request-2fa', (data) => {
    const { userId, username } = data;
    if (userConnections[userId]) {
      io.to(userConnections[userId]).emit('show-2fa-modal', { username });
    }
  });

  socket.on('account-log', (data) => {
    const { userId } = data;
    if (userConnections[userId]) {
      io.to(userConnections[userId]).emit('log-added', data);
    }
  });

  socket.on('disconnect', () => {
    for (const userId in userConnections) {
      if (userConnections[userId] === socket.id) {
        BotManagerService.unregisterUserSession(userId, socket.id);
        delete userConnections[userId];
      }
    }
    logger.info(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on port ${PORT}`);
});
