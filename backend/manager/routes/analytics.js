const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getUserActivityStats,
  getTeamPerformanceStats,
  getTaskTrendStats,
  getDashboardStats,
  generateReport
} = require('../controllers/analyticsController');

/**
 * @route GET /api/admin/analytics/dashboard
 * @desc 获取综合仪表板统计
 * @access Admin
 */
router.get('/dashboard', adminAuth, getDashboardStats);

/**
 * @route GET /api/admin/analytics/users
 * @desc 获取用户活跃度统计
 * @access Admin
 */
router.get('/users', adminAuth, getUserActivityStats);

/**
 * @route GET /api/admin/analytics/teams
 * @desc 获取团队绩效统计
 * @access Admin
 */
router.get('/teams', adminAuth, getTeamPerformanceStats);

/**
 * @route GET /api/admin/analytics/tasks
 * @desc 获取任务趋势统计
 * @access Admin
 */
router.get('/tasks', adminAuth, getTaskTrendStats);

/**
 * @route POST /api/admin/analytics/reports
 * @desc 生成报告
 * @access Admin
 */
router.post('/reports', adminAuth, logAdminAction('generate_report'), generateReport);

module.exports = router;