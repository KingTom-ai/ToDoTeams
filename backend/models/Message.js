const mongoose = require('mongoose');

/**
 * 消息事件类型枚举
 * 根据团队权限设置文档定义的各种事件类型
 */
const EVENT_TYPES = {
  // 成员管理相关
  MEMBER_JOIN: 'member_join',           // 成员加入团队
  MEMBER_LEAVE: 'member_leave',         // 成员离开团队
  MEMBER_REMOVED: 'member_removed',     // 成员被移除
  
  // 角色变更相关
  ROLE_CHANGE: 'role_change',           // 角色变更（Member <-> Manager）
  ROLE_PROMOTED: 'role_promoted',       // 角色提升
  ROLE_DEMOTED: 'role_demoted',         // 角色降级
  
  // 权限变更相关
  PERMISSION_GRANTED: 'permission_granted',   // 权限授予
  PERMISSION_REVOKED: 'permission_revoked',   // 权限撤销
  
  // 团队管理相关
  TEAM_CREATED: 'team_created',         // 团队创建
  TEAM_DELETED: 'team_deleted',         // 团队删除
  TEAM_UPDATED: 'team_updated',         // 团队信息更新
  
  // 任务相关
  TASK_ASSIGNED: 'task_assigned',       // 任务分配
  TASK_COMPLETED: 'task_completed',     // 任务完成
  TASK_OVERDUE: 'task_overdue',         // 任务逾期
  MENTION: 'mention',                   // @提醒
  
  // 审计相关
  AUDIT_LOG: 'audit_log',               // 审计日志
  SECURITY_ALERT: 'security_alert'      // 安全警报
};

const messageSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 可选，系统消息可能没有特定用户
  eventType: { 
    type: String, 
    required: true,
    enum: Object.values(EVENT_TYPES)
  },
  content: { type: String, required: true },
  
  // 扩展字段：存储事件相关的额外数据
  metadata: {
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 目标用户（如被操作的用户）
    oldRole: { type: String }, // 原角色
    newRole: { type: String }, // 新角色
    permission: { type: String }, // 相关权限
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // 相关任务
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 操作者
  },
  
  // 消息优先级
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  
  // 是否已读
  isRead: { type: Boolean, default: false },
  
  // 消息类型（通知、警告、错误等）
  messageType: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  
  createdAt: { type: Date, default: Date.now },
  readAt: { type: Date } // 阅读时间
});

// 添加索引以提高查询性能
messageSchema.index({ teamId: 1, createdAt: -1 });
messageSchema.index({ userId: 1, isRead: 1 });
messageSchema.index({ eventType: 1 });

/**
 * 函数级注释：创建消息的静态方法
 * @param {Object} messageData - 消息数据
 * @returns {Promise<Message>} 创建的消息对象
 */
messageSchema.statics.createMessage = async function(messageData) {
  const message = new this(messageData);
  return await message.save();
};

/**
 * 函数级注释：标记消息为已读
 * @returns {Promise<Message>} 更新后的消息对象
 */
messageSchema.methods.markAsRead = async function() {
  this.isRead = true;
  this.readAt = new Date();
  return await this.save();
};

// 导出事件类型常量和模型
module.exports = {
  Message: mongoose.model('Message', messageSchema),
  EVENT_TYPES
};