const express = require('express');
const router = express.Router();
const os = require('os');
const adminAuth = require('../middleware/auth').adminAuth; // 假设有adminAuth中间件

// 获取系统性能
router.get('/performance', adminAuth, (req, res) => {
    const uptime = os.uptime();
    const memory = os.totalmem() - os.freemem();
    const cpu = os.loadavg();
    const platform = os.platform();
    res.json({
        uptime: `${Math.floor(uptime / 3600)} hours`,
        memory: `${(memory / 1024 / 1024).toFixed(2)} MB used`,
        cpu: cpu[0].toFixed(2),
        platform
    });
});

// 获取系统日志 (简单模拟)
router.get('/logs', adminAuth, (req, res) => {
    // 在实际中，应从日志文件或数据库读取
    const logs = [
        { timestamp: new Date(), message: 'System started' },
        { timestamp: new Date(), message: 'User logged in' }
    ];
    res.json({ logs });
});

module.exports = router;