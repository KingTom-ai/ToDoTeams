const express = require('express');
const router = express.Router();
const { adminAuth, superAdminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getSystemLogs,
  getSystemConfig,
  updateSystemConfig,
  getSystemPerformance,
  cleanupSystem,
  backupSystem,
  getSystemHealth
} = require('../controllers/systemController');

/**
 * @route GET /api/admin/system/logs
 * @desc 获取系统日志
 * @access Admin
 */
router.get('/logs', adminAuth, getSystemLogs);

/**
 * @route GET /api/admin/system/config
 * @desc 获取系统配置
 * @access Admin
 */
router.get('/config', adminAuth, getSystemConfig);

/**
 * @route PUT /api/admin/system/config
 * @desc 更新系统配置
 * @access SuperAdmin
 */
router.put('/config', superAdminAuth, logAdminAction('update_system_config'), updateSystemConfig);

/**
 * @route GET /api/admin/system/performance
 * @desc 获取系统性能监控数据
 * @access Admin
 */
router.get('/performance', adminAuth, getSystemPerformance);

/**
 * @route POST /api/admin/system/cleanup
 * @desc 清理系统数据
 * @access SuperAdmin
 */
router.post('/cleanup', superAdminAuth, logAdminAction('system_cleanup'), cleanupSystem);

/**
 * @route POST /api/admin/system/backup
 * @desc 备份系统数据
 * @access SuperAdmin
 */
router.post('/backup', superAdminAuth, logAdminAction('system_backup'), backupSystem);

/**
 * @route GET /api/admin/system/health
 * @desc 获取系统健康状态
 * @access Admin
 */
router.get('/health', adminAuth, getSystemHealth);

module.exports = router;