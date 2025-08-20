const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getMessages,
  getMessageById,
  sendBroadcast,
  deleteMessage,
  batchDeleteMessages,
  getMessageStats,
  markMessageRead
} = require('../controllers/messageController');

/**
 * @route GET /admin/messages
 * @desc 获取所有消息列表
 * @access Admin
 */
router.get('/', adminAuth, logAdminAction('GET_MESSAGES'), getMessages);

/**
 * @route GET /admin/messages/stats
 * @desc 获取消息统计
 * @access Admin
 */
router.get('/stats', adminAuth, logAdminAction('GET_MESSAGE_STATS'), getMessageStats);

/**
 * @route GET /admin/messages/:id
 * @desc 获取消息详情
 * @access Admin
 */
router.get('/:id', adminAuth, logAdminAction('GET_MESSAGE_DETAIL'), getMessageById);

/**
 * @route POST /admin/messages/broadcast
 * @desc 发送系统广播消息
 * @access Admin
 */
router.post('/broadcast', adminAuth, logAdminAction('SEND_BROADCAST'), sendBroadcast);

/**
 * @route PUT /admin/messages/:id/read
 * @desc 标记消息为已读/未读
 * @access Admin
 */
router.put('/:id/read', adminAuth, logAdminAction('MARK_MESSAGE_READ'), markMessageRead);

/**
 * @route DELETE /admin/messages/:id
 * @desc 删除消息
 * @access Admin
 */
router.delete('/:id', adminAuth, logAdminAction('DELETE_MESSAGE'), deleteMessage);

/**
 * @route DELETE /admin/messages/batch/delete
 * @desc 批量删除消息
 * @access Admin
 */
router.delete('/batch/delete', adminAuth, logAdminAction('BATCH_DELETE_MESSAGES'), batchDeleteMessages);

module.exports = router;