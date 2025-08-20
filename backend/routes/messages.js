const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Message, EVENT_TYPES } = require('../models/Message');
const Team = require('../models/Team');

// 获取团队消息
router.get('/:teamId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    if (!team.members.some(m => m.user.toString() === req.user)) return res.status(403).json({ msg: 'Not authorized' });
    const messages = await Message.find({ teamId: req.params.teamId }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取用户所有团队的消息
router.get('/', auth, async (req, res) => {
  try {
    console.log('Fetching all team messages for user:', req.user);
    const teams = await Team.find({ 'members.user': req.user });
    const teamIds = teams.map(team => team._id);
    const messages = await Message.find({ teamId: { $in: teamIds } }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 函数级注释：创建消息的辅助函数
 * @param {string} teamId - 团队ID
 * @param {string} eventType - 事件类型
 * @param {string} content - 消息内容
 * @param {Object} options - 可选参数
 * @param {string} options.userId - 用户ID
 * @param {Object} options.metadata - 元数据
 * @param {string} options.priority - 优先级
 * @param {string} options.messageType - 消息类型
 * @returns {Promise<Message>} 创建的消息对象
 */
const createMessage = async (teamId, eventType, content, options = {}) => {
  const messageData = {
    teamId,
    eventType,
    content,
    userId: options.userId,
    metadata: options.metadata || {},
    priority: options.priority || 'medium',
    messageType: options.messageType || 'info'
  };
  
  return await Message.createMessage(messageData);
};

/**
 * 函数级注释：标记消息为已读
 */
router.patch('/:messageId/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ msg: 'Message not found' });
    
    // 检查用户是否有权限访问该消息
    const team = await Team.findById(message.teamId);
    if (!team || !team.members.some(m => m.user.toString() === req.user)) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    
    await message.markAsRead();
    res.json({ msg: 'Message marked as read' });
  } catch (err) {
    console.error('Error marking message as read:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 函数级注释：获取未读消息数量
 */
router.get('/unread/count', auth, async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user });
    const teamIds = teams.map(team => team._id);
    const unreadCount = await Message.countDocuments({ 
      teamId: { $in: teamIds }, 
      isRead: false 
    });
    res.json({ unreadCount });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;