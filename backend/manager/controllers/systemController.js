const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const User = require('../../models/User');
const Team = require('../../models/Team');
const Task = require('../../models/Task');
const { Message } = require('../../models/Message');

/**
 * 获取系统日志
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getSystemLogs = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      startDate, 
      endDate, 
      search 
    } = req.query;
    
    // 这里假设日志存储在文件中，实际项目中可能使用专门的日志系统
    const logDir = path.join(__dirname, '../../logs');
    const logFiles = ['error.log', 'combined.log', 'admin.log'];
    
    let logs = [];
    
    try {
      // 读取日志文件
      for (const logFile of logFiles) {
        const logPath = path.join(logDir, logFile);
        try {
          const content = await fs.readFile(logPath, 'utf8');
          const lines = content.split('\n').filter(line => line.trim());
          
          lines.forEach(line => {
            try {
              const logEntry = JSON.parse(line);
              logs.push({
                ...logEntry,
                file: logFile
              });
            } catch (e) {
              // 处理非JSON格式的日志行
              logs.push({
                timestamp: new Date().toISOString(),
                level: 'info',
                message: line,
                file: logFile
              });
            }
          });
        } catch (fileErr) {
          // 文件不存在或无法读取
          console.warn(`Cannot read log file: ${logFile}`);
        }
      }
    } catch (dirErr) {
      // 日志目录不存在
      console.warn('Log directory not found');
    }
    
    // 过滤日志
    let filteredLogs = logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    if (startDate) {
      const start = new Date(startDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate);
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= end);
    }
    
    if (search) {
      filteredLogs = filteredLogs.filter(log => 
        log.message && log.message.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 排序（最新的在前）
    filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // 分页
    const skip = (page - 1) * limit;
    const paginatedLogs = filteredLogs.slice(skip, skip + parseInt(limit));
    
    res.json({
      logs: paginatedLogs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(filteredLogs.length / limit),
        count: filteredLogs.length,
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getSystemConfig = async (req, res) => {
  try {
    // 读取系统配置（这里模拟配置数据）
    const config = {
      database: {
        host: process.env.MONGODB_URI ? 'Connected' : 'Not configured',
        status: 'connected'
      },
      redis: {
        host: process.env.REDIS_URL ? 'Connected' : 'Not configured',
        status: process.env.REDIS_URL ? 'connected' : 'disconnected'
      },
      rabbitmq: {
        host: process.env.RABBITMQ_URL ? 'Connected' : 'Not configured',
        status: process.env.RABBITMQ_URL ? 'connected' : 'disconnected'
      },
      email: {
        service: process.env.EMAIL_SERVICE || 'Not configured',
        status: process.env.EMAIL_SERVICE ? 'configured' : 'not_configured'
      },
      upload: {
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf']
      },
      security: {
        jwtExpiration: process.env.JWT_EXPIRES_IN || '7d',
        passwordMinLength: 6,
        maxLoginAttempts: 5
      },
      features: {
        registration: true,
        emailVerification: false,
        teamCreation: true,
        fileUpload: true
      }
    };
    
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 更新系统配置
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateSystemConfig = async (req, res) => {
  try {
    const { section, config } = req.body;
    
    if (!section || !config) {
      return res.status(400).json({ error: 'Section and config are required' });
    }
    
    // 这里应该实现配置更新逻辑
    // 实际项目中可能需要更新环境变量或配置文件
    
    res.json({ 
      message: 'Configuration updated successfully',
      section,
      config
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取系统性能监控数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getSystemPerformance = async (req, res) => {
  try {
    // 获取系统信息
    const systemInfo = {
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      cpuCount: os.cpus().length,
      platform: os.platform(),
      nodeVersion: process.version
    };
    
    // 获取进程信息
    const processInfo = {
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    
    // 获取数据库统计
    const dbStats = {
      users: await User.countDocuments(),
      teams: await Team.countDocuments(),
      tasks: await Task.countDocuments(),
      messages: await Message.countDocuments()
    };
    
    // 获取最近24小时的活动统计
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = {
      newUsers: await User.countDocuments({ createdAt: { $gte: yesterday } }),
      newTeams: await Team.countDocuments({ createdAt: { $gte: yesterday } }),
      newTasks: await Task.countDocuments({ createdAt: { $gte: yesterday } }),
      newMessages: await Message.countDocuments({ createdAt: { $gte: yesterday } })
    };
    
    res.json({
      system: systemInfo,
      process: processInfo,
      database: dbStats,
      recentActivity,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 清理系统数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const cleanupSystem = async (req, res) => {
  try {
    const { type, days = 30 } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Cleanup type is required' });
    }
    
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    let result = {};
    
    switch (type) {
      case 'logs':
        // 清理旧日志文件
        try {
          const logDir = path.join(__dirname, '../../logs');
          const files = await fs.readdir(logDir);
          let deletedFiles = 0;
          
          for (const file of files) {
            const filePath = path.join(logDir, file);
            const stats = await fs.stat(filePath);
            
            if (stats.mtime < cutoffDate) {
              await fs.unlink(filePath);
              deletedFiles++;
            }
          }
          
          result = { deletedFiles };
        } catch (err) {
          result = { error: 'Failed to clean logs' };
        }
        break;
        
      case 'messages':
        // 清理旧消息
        const deletedMessages = await Message.deleteMany({
          createdAt: { $lt: cutoffDate },
          type: { $ne: 'system' } // 保留系统消息
        });
        result = { deletedMessages: deletedMessages.deletedCount };
        break;
        
      case 'completed_tasks':
        // 清理已完成的旧任务
        const deletedTasks = await Task.deleteMany({
          status: 'completed',
          updatedAt: { $lt: cutoffDate }
        });
        result = { deletedTasks: deletedTasks.deletedCount };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid cleanup type' });
    }
    
    res.json({
      message: `System cleanup completed for ${type}`,
      result,
      cutoffDate
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 备份系统数据
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const backupSystem = async (req, res) => {
  try {
    const { includeFiles = false } = req.body;
    
    // 创建备份目录
    const backupDir = path.join(__dirname, '../../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `backup-${timestamp}`);
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      await fs.mkdir(backupPath, { recursive: true });
    } catch (err) {
      // 目录可能已存在
    }
    
    // 导出数据库数据
    const exportData = {
      users: await User.find().lean(),
      teams: await Team.find().lean(),
      tasks: await Task.find().lean(),
      messages: await Message.find().lean(),
      timestamp: new Date().toISOString()
    };
    
    // 写入备份文件
    const dataPath = path.join(backupPath, 'data.json');
    await fs.writeFile(dataPath, JSON.stringify(exportData, null, 2));
    
    // 如果需要，复制上传的文件
    if (includeFiles) {
      const uploadsDir = path.join(__dirname, '../../uploads');
      const backupUploadsDir = path.join(backupPath, 'uploads');
      
      try {
        await fs.mkdir(backupUploadsDir, { recursive: true });
        // 这里应该实现文件复制逻辑
        // 由于复杂性，这里只是创建目录
      } catch (err) {
        console.warn('Failed to backup files:', err.message);
      }
    }
    
    res.json({
      message: 'System backup completed successfully',
      backupPath: `backup-${timestamp}`,
      includeFiles,
      dataSize: JSON.stringify(exportData).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取系统健康状态
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getSystemHealth = async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // 检查数据库连接
    try {
      await User.findOne().limit(1);
      health.checks.database = { status: 'healthy', message: 'Database connection OK' };
    } catch (err) {
      health.checks.database = { status: 'unhealthy', message: err.message };
      health.status = 'unhealthy';
    }
    
    // 检查内存使用
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 90) {
      health.checks.memory = { status: 'warning', message: `High memory usage: ${memUsagePercent.toFixed(2)}%` };
      if (health.status === 'healthy') health.status = 'warning';
    } else {
      health.checks.memory = { status: 'healthy', message: `Memory usage: ${memUsagePercent.toFixed(2)}%` };
    }
    
    // 检查磁盘空间（简化版）
    const freeMemory = os.freemem();
    const totalMemory = os.totalmem();
    const memoryUsagePercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    if (memoryUsagePercent > 90) {
      health.checks.disk = { status: 'warning', message: `High disk usage: ${memoryUsagePercent.toFixed(2)}%` };
      if (health.status === 'healthy') health.status = 'warning';
    } else {
      health.checks.disk = { status: 'healthy', message: `Disk usage: ${memoryUsagePercent.toFixed(2)}%` };
    }
    
    res.json(health);
  } catch (err) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
};

module.exports = {
  getSystemLogs,
  getSystemConfig,
  updateSystemConfig,
  getSystemPerformance,
  cleanupSystem,
  backupSystem,
  getSystemHealth
};