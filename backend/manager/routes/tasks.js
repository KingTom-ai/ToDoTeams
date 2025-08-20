const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  batchUpdateTasks,
  batchDeleteTasks
} = require('../controllers/taskController');

/**
 * @route GET /admin/tasks
 * @desc 获取所有任务列表（跨团队、状态过滤）
 * @access Admin
 */
router.get('/', adminAuth, logAdminAction('GET_TASKS'), getTasks);

/**
 * @route GET /admin/tasks/stats
 * @desc 获取任务统计
 * @access Admin
 */
router.get('/stats', adminAuth, logAdminAction('GET_TASK_STATS'), getTaskStats);

/**
 * @route GET /admin/tasks/:id
 * @desc 获取任务详情
 * @access Admin
 */
router.get('/:id', adminAuth, logAdminAction('GET_TASK_DETAIL'), getTaskById);

/**
 * @route PUT /admin/tasks/:id
 * @desc 更新任务
 * @access Admin
 */
router.put('/:id', adminAuth, logAdminAction('UPDATE_TASK'), updateTask);

/**
 * @route DELETE /admin/tasks/:id
 * @desc 删除任务
 * @access Admin
 */
router.delete('/:id', adminAuth, logAdminAction('DELETE_TASK'), deleteTask);

/**
 * @route PUT /admin/tasks/batch/update
 * @desc 批量更新任务
 * @access Admin
 */
router.put('/batch/update', adminAuth, logAdminAction('BATCH_UPDATE_TASKS'), batchUpdateTasks);

/**
 * @route DELETE /admin/tasks/batch/delete
 * @desc 批量删除任务
 * @access Admin
 */
router.delete('/batch/delete', adminAuth, logAdminAction('BATCH_DELETE_TASKS'), batchDeleteTasks);

module.exports = router;