const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*' } });
app.set('io', io);
const port = process.env.PORT || 5001;

// CORS配置 - 允许局域网设备访问
app.use(cors({
  origin: function (origin, callback) {
    // 允许所有来源，包括局域网访问
    callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// MongoDB 连接
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err));
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/teamgroups', require('./routes/teamgroups'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));

// Admin Routes
app.use('/api/admin/users', require('./manager/routes/users'));
app.use('/api/admin/teams', require('./manager/routes/teams'));
app.use('/api/admin/tasks', require('./manager/routes/tasks'));
app.use('/api/admin/messages', require('./manager/routes/messages'));
app.use('/api/admin/groups', require('./manager/routes/groups'));
app.use('/api/admin/system', require('./manager/routes/system'));
app.use('/api/admin/analytics', require('./manager/routes/analytics'));

// 静态文件服务 - 提供附件访问
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 后台管理界面路由 - 优先处理后台管理路径
app.get('/admin/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// 后台管理登录页
app.get('/admin/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 后台管理界面根路径显示登录页
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 静态文件服务 - 后台管理界面的CSS、JS等资源
app.use('/admin/css', express.static(path.join(__dirname, 'public', 'css')));
app.use('/admin/js', express.static(path.join(__dirname, 'public', 'js')));
app.use('/admin/images', express.static(path.join(__dirname, 'public', 'images')));

// 使用后端托管前端构建产物（非 /api 与 /admin 路由）
// 注意：要放在 admin 静态资源与路由之后，避免覆盖 /admin
const frontendBuildPath = path.join(__dirname, '..', 'build');
if (fs.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  app.get(/^(?!\/api|\/admin).*/, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  // 若未构建前端或缺少 build 目录，给出友好提示
  app.get(/^(?!\/api|\/admin).*/, (req, res) => {
    res.status(404).json({
      message: '未检测到前端构建产物(build)。请在项目根目录运行: npm run build',
      adminUrl: '/admin/dashboard'
    });
  });
}

// 未被 /api 或 /admin 命中的路径将由前端静态资源处理；若缺少 build 则返回友好提示
// 兜底：返回 404 JSON，并附带 adminUrl 与 frontendUrl
app.get(/^(?!\/api|\/admin).*/, (req, res) => {
  const protocol = req.get('x-forwarded-proto') || (req.connection && req.connection.encrypted ? 'https' : 'http');
  const host = req.get('x-forwarded-host') || req.get('host');
  res.status(404).json({ 
    message: '未找到资源。前端应用已由该端口托管，请访问根路径 /',
    adminUrl: '/admin/dashboard',
    frontendUrl: `${protocol}://${host}/`
  });
});

const jwt = require('jsonwebtoken');

// Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.user.id);
  socket.join(socket.user.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

if (process.env.NODE_ENV !== 'test') {
  // 获取本机IP地址
  const { networkInterfaces } = require('os');
  function getLocalIP() {
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
    return 'localhost';
  }
  
  // 绑定到0.0.0.0以支持局域网访问
  server.listen(port, '0.0.0.0', () => {
    const localIP = getLocalIP();
    console.log(`Server running on port ${port}`);
    console.log(`Local: http://localhost:${port}`);
    console.log(`Network: http://${localIP}:${port}`);
    console.log(`Admin Panel: http://${localIP}:${port}/admin`);
    console.log(`Admin Login: http://localhost:${port}/admin (本地访问)`);
  });
}

module.exports = app;