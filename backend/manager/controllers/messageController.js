const { Message } = require('../../models/Message');
const Team = require('../../models/Team');
const User = require('../../models/User');
const MessageService = require('../../services/messageService');

/**
 * 获取所有消息列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getMessages = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      type, 
      teamId, 
      userId,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { content: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (type) {
      query.type = type;
    }
    
    if (teamId) {
      query.teamId = teamId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    // 日期范围过滤
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }
    
    // 计算分页
    const parsedLimit = parseInt(limit);
    const skip = (page - 1) * parsedLimit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // 查询消息
    let query_builder = Message.find(query)
      .populate('userId', 'username email avatarUrl')
      .populate('teamId', 'name teamID')
      .populate('targetUserId', 'username email')
      .sort(sort)
      .skip(skip);
    
    // 如果limit为0，则不限制数量
    if (parsedLimit > 0) {
      query_builder = query_builder.limit(parsedLimit);
    }
    
    const messages = await query_builder;
    
    // 获取总数
    const total = await Message.countDocuments(query);
    
    res.json({
      messages,
      pagination: {
        current: parseInt(page),
        total: parsedLimit > 0 ? Math.ceil(total / parsedLimit) : 1,
        count: total,
        limit: parsedLimit
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取消息详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getMessageById = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('userId', 'username email avatarUrl')
      .populate('teamId', 'name teamID members')
      .populate('targetUserId', 'username email avatarUrl')
      .populate('taskId', 'title status');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 发送系统广播消息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const sendBroadcast = async (req, res) => {
  try {
    const { title, content, targetType = 'all', targetIds = [] } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    let recipients = [];
    
    // 根据目标类型确定接收者
    switch (targetType) {
      case 'all':
        // 发送给所有用户
        recipients = await User.find({}, '_id username');
        break;
        
      case 'users':
        // 发送给指定用户
        if (targetIds.length === 0) {
          return res.status(400).json({ error: 'Target user IDs are required' });
        }
        recipients = await User.find({ _id: { $in: targetIds } }, '_id username');
        break;
        
      case 'teams':
        // 发送给指定团队的所有成员
        if (targetIds.length === 0) {
          return res.status(400).json({ error: 'Target team IDs are required' });
        }
        const teams = await Team.find({ _id: { $in: targetIds } }).populate('members.user', '_id username');
        const memberIds = new Set();
        teams.forEach(team => {
          team.members.forEach(member => {
            memberIds.add(member.user._id.toString());
          });
        });
        recipients = await User.find({ _id: { $in: Array.from(memberIds) } }, '_id username');
        break;
        
      case 'admins':
        // 发送给所有管理员
        recipients = await User.find({ role: 'admin' }, '_id username');
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid target type' });
    }
    
    if (recipients.length === 0) {
      return res.status(400).json({ error: 'No recipients found' });
    }
    
    // 创建广播消息记录
    const broadcastMessages = [];
    
    for (const recipient of recipients) {
      const message = new Message({
        title,
        content,
        type: 'system_broadcast',
        userId: req.user, // 发送者（管理员）
        targetUserId: recipient._id, // 接收者
        isRead: false,
        metadata: {
          broadcastType: targetType,
          sentBy: req.user
        }
      });
      
      broadcastMessages.push(message);
    }
    
    // 批量保存消息
    await Message.insertMany(broadcastMessages);
    
    // 通过Socket.IO发送实时通知
    const io = req.app.get('io');
    if (io) {
      recipients.forEach(recipient => {
        io.to(recipient._id.toString()).emit('notification', {
          type: 'system_broadcast',
          title,
          message: content,
          timestamp: new Date()
        });
      });
    }
    
    res.json({
      message: `Broadcast sent to ${recipients.length} recipients`,
      recipientCount: recipients.length,
      recipients: recipients.map(r => ({ id: r._id, username: r.username }))
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除消息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.id;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // 删除消息
    await Message.findByIdAndDelete(messageId);
    
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 批量删除消息
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const batchDeleteMessages = async (req, res) => {
  try {
    const { messageIds } = req.body;
    
    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'Message IDs are required' });
    }
    
    // 批量删除消息
    const result = await Message.deleteMany({ _id: { $in: messageIds } });
    
    res.json({
      message: `${result.deletedCount} messages deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取消息统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getMessageStats = async (req, res) => {
  try {
    const { teamId, userId, dateFrom, dateTo } = req.query;
    
    // 构建基础查询条件
    const baseQuery = {};
    if (teamId) baseQuery.teamId = teamId;
    if (userId) baseQuery.userId = userId;
    
    // 日期范围
    if (dateFrom || dateTo) {
      baseQuery.createdAt = {};
      if (dateFrom) baseQuery.createdAt.$gte = new Date(dateFrom);
      if (dateTo) baseQuery.createdAt.$lte = new Date(dateTo);
    }
    
    // 总消息数
    const totalMessages = await Message.countDocuments(baseQuery);
    
    // 按类型统计
    const typeStats = await Message.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 已读/未读统计
    const readStats = await Message.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$isRead',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按团队统计（如果没有指定团队）
    let teamStats = [];
    if (!teamId) {
      teamStats = await Message.aggregate([
        { $match: { ...baseQuery, teamId: { $exists: true } } },
        {
          $group: {
            _id: '$teamId',
            count: { $sum: 1 },
            unreadCount: {
              $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'teams',
            localField: '_id',
            foreignField: '_id',
            as: 'team'
          }
        },
        {
          $unwind: '$team'
        },
        {
          $project: {
            teamName: '$team.name',
            teamID: '$team.teamID',
            totalMessages: '$count',
            unreadMessages: '$unreadCount',
            readRate: {
              $round: [{ $multiply: [{ $divide: [{ $subtract: ['$count', '$unreadCount'] }, '$count'] }, 100] }, 0]
            }
          }
        },
        { $sort: { totalMessages: -1 } }
      ]);
    }
    
    // 按用户统计（如果没有指定用户）
    let userStats = [];
    if (!userId) {
      userStats = await Message.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $project: {
            username: '$user.username',
            email: '$user.email',
            messageCount: '$count'
          }
        },
        { $sort: { messageCount: -1 } },
        { $limit: 10 }
      ]);
    }
    
    // 每日消息统计（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await Message.aggregate([
      {
        $match: {
          ...baseQuery,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    // 阅读率
    const readMessages = await Message.countDocuments({ ...baseQuery, isRead: true });
    const readRate = totalMessages > 0 ? Math.round((readMessages / totalMessages) * 100) : 0;
    
    res.json({
      summary: {
        totalMessages,
        readMessages,
        unreadMessages: totalMessages - readMessages,
        readRate
      },
      typeStats,
      readStats,
      teamStats,
      userStats,
      dailyStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 标记消息为已读/未读
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const markMessageRead = async (req, res) => {
  try {
    const { isRead = true } = req.body;
    const messageId = req.params.id;
    
    const message = await Message.findByIdAndUpdate(
      messageId,
      { isRead, readAt: isRead ? new Date() : null },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    res.json(message);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getMessages,
  getMessageById,
  sendBroadcast,
  deleteMessage,
  batchDeleteMessages,
  getMessageStats,
  markMessageRead
};