const { Message, EVENT_TYPES } = require('../models/Message');
const Team = require('../models/Team');
const User = require('../models/User');

/**
 * 消息通知服务
 * 根据团队权限设置文档实现各种事件的消息通知功能
 */
class MessageService {
  
  /**
   * 函数级注释：成员加入团队通知
   * @param {string} teamId - 团队ID
   * @param {string} newMemberId - 新成员ID
   * @param {string} operatorId - 操作者ID
   */
  static async notifyMemberJoin(teamId, newMemberId, operatorId) {
    try {
      const newMember = await User.findById(newMemberId);
      const operator = await User.findById(operatorId);
      const team = await Team.findById(teamId);
      
      const content = `新成员 ${newMember.name || newMember.email} 加入了团队 "${team.name}"`;
      
      await Message.createMessage({
        teamId,
        eventType: EVENT_TYPES.MEMBER_JOIN,
        content,
        userId: operatorId,
        metadata: {
          targetUserId: newMemberId,
          operatorId
        },
        priority: 'medium',
        messageType: 'success'
      });
    } catch (error) {
      console.error('Error creating member join notification:', error);
    }
  }
  
  /**
   * 函数级注释：成员离开团队通知
   * @param {string} teamId - 团队ID
   * @param {string} memberId - 离开的成员ID
   * @param {string} operatorId - 操作者ID（可能是自己离开或被移除）
   * @param {boolean} isRemoved - 是否被移除
   */
  static async notifyMemberLeave(teamId, memberId, operatorId, isRemoved = false) {
    try {
      const member = await User.findById(memberId);
      const operator = await User.findById(operatorId);
      const team = await Team.findById(teamId);
      
      const eventType = isRemoved ? EVENT_TYPES.MEMBER_REMOVED : EVENT_TYPES.MEMBER_LEAVE;
      const content = isRemoved 
        ? `成员 ${member.name || member.email} 被 ${operator.name || operator.email} 从团队 "${team.name}" 中移除`
        : `成员 ${member.name || member.email} 离开了团队 "${team.name}"`;
      
      await Message.createMessage({
        teamId,
        eventType,
        content,
        userId: operatorId,
        metadata: {
          targetUserId: memberId,
          operatorId
        },
        priority: 'medium',
        messageType: isRemoved ? 'warning' : 'info'
      });
    } catch (error) {
      console.error('Error creating member leave notification:', error);
    }
  }
  
  /**
   * 函数级注释：角色变更通知
   * @param {string} teamId - 团队ID
   * @param {string} targetUserId - 目标用户ID
   * @param {string} oldRole - 原角色
   * @param {string} newRole - 新角色
   * @param {string} operatorId - 操作者ID
   */
  static async notifyRoleChange(teamId, targetUserId, oldRole, newRole, operatorId) {
    try {
      const targetUser = await User.findById(targetUserId);
      const operator = await User.findById(operatorId);
      const team = await Team.findById(teamId);
      
      const content = `${targetUser.name || targetUser.email} 的角色从 ${oldRole} 变更为 ${newRole}`;
      
      // 确定事件类型和消息类型
      let eventType = EVENT_TYPES.ROLE_CHANGE;
      let messageType = 'info';
      
      if ((oldRole === 'Member' && newRole === 'Manager') || 
          (oldRole === 'Manager' && newRole === 'Creator')) {
        eventType = EVENT_TYPES.ROLE_PROMOTED;
        messageType = 'success';
      } else if ((oldRole === 'Manager' && newRole === 'Member') || 
                 (oldRole === 'Creator' && newRole === 'Manager')) {
        eventType = EVENT_TYPES.ROLE_DEMOTED;
        messageType = 'warning';
      }
      
      await Message.createMessage({
        teamId,
        eventType,
        content,
        userId: operatorId,
        metadata: {
          targetUserId,
          oldRole,
          newRole,
          operatorId
        },
        priority: 'high',
        messageType
      });
    } catch (error) {
      console.error('Error creating role change notification:', error);
    }
  }
  
  /**
   * 函数级注释：权限变更通知
   * @param {string} teamId - 团队ID
   * @param {string} targetUserId - 目标用户ID
   * @param {string} permission - 权限名称
   * @param {boolean} isGranted - 是否授予权限
   * @param {string} operatorId - 操作者ID
   */
  static async notifyPermissionChange(teamId, targetUserId, permission, isGranted, operatorId) {
    try {
      const targetUser = await User.findById(targetUserId);
      const operator = await User.findById(operatorId);
      
      const eventType = isGranted ? EVENT_TYPES.PERMISSION_GRANTED : EVENT_TYPES.PERMISSION_REVOKED;
      const content = `${targetUser.name || targetUser.email} 的权限 "${permission}" 已${isGranted ? '授予' : '撤销'}`;
      
      await Message.createMessage({
        teamId,
        eventType,
        content,
        userId: operatorId,
        metadata: {
          targetUserId,
          permission,
          operatorId
        },
        priority: 'medium',
        messageType: isGranted ? 'success' : 'warning'
      });
    } catch (error) {
      console.error('Error creating permission change notification:', error);
    }
  }
  
  /**
   * 函数级注释：团队删除通知
   * @param {string} teamId - 团队ID
   * @param {string} teamName - 团队名称
   * @param {string} operatorId - 操作者ID
   * @param {Array} memberIds - 团队成员ID列表
   */
  static async notifyTeamDeletion(teamId, teamName, operatorId, memberIds) {
    try {
      const operator = await User.findById(operatorId);
      const content = `团队 "${teamName}" 已被 ${operator.name || operator.email} 删除`;
      
      // 为每个成员创建通知消息
      const messagePromises = memberIds.map(memberId => 
        Message.createMessage({
          teamId,
          eventType: EVENT_TYPES.TEAM_DELETED,
          content,
          userId: operatorId,
          metadata: {
            operatorId,
            teamName
          },
          priority: 'urgent',
          messageType: 'error'
        })
      );
      
      await Promise.all(messagePromises);
    } catch (error) {
      console.error('Error creating team deletion notification:', error);
    }
  }
  
  /**
   * 函数级注释：任务分配通知
   * @param {string} teamId - 团队ID
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题
   * @param {string} assigneeId - 被分配者ID
   * @param {string} operatorId - 操作者ID
   */
  static async notifyTaskAssignment(teamId, taskId, taskTitle, assigneeId, operatorId) {
    try {
      const assignee = await User.findById(assigneeId);
      const operator = await User.findById(operatorId);
      
      const content = `任务 "${taskTitle}" 已分配给 ${assignee.name || assignee.email}`;
      
      await Message.createMessage({
        teamId,
        eventType: EVENT_TYPES.TASK_ASSIGNED,
        content,
        userId: operatorId,
        metadata: {
          targetUserId: assigneeId,
          taskId,
          operatorId
        },
        priority: 'medium',
        messageType: 'info'
      });
    } catch (error) {
      console.error('Error creating task assignment notification:', error);
    }
  }
  
  /**
   * 函数级注释：安全警报通知
   * @param {string} teamId - 团队ID
   * @param {string} alertType - 警报类型
   * @param {string} description - 警报描述
   * @param {string} userId - 相关用户ID
   */
  static async notifySecurityAlert(teamId, alertType, description, userId) {
    try {
      const content = `安全警报: ${description}`;
      
      await Message.createMessage({
        teamId,
        eventType: EVENT_TYPES.SECURITY_ALERT,
        content,
        userId,
        metadata: {
          alertType,
          userId
        },
        priority: 'urgent',
        messageType: 'error'
      });
    } catch (error) {
      console.error('Error creating security alert notification:', error);
    }
  }
  
  /**
   * 函数级注释：团队创建通知
   * @param {string} teamId - 团队ID
   * @param {string} teamName - 团队名称
   * @param {string} creatorId - 创建者用户ID
   */
  static async notifyTeamCreation(teamId, teamName, creatorId) {
    try {
      const content = `团队 "${teamName}" 已创建`;
      
      await Message.createMessage({
        teamId,
        userId: creatorId,
        eventType: EVENT_TYPES.TEAM_CREATED,
        content,
        metadata: {
          operatorId: creatorId
        },
        priority: 'medium',
        messageType: 'success'
      });
    } catch (error) {
      console.error('发送团队创建通知失败:', error);
    }
  }

  /**
   * 函数级注释：发送@提醒通知
   * @param {string} teamId - 团队ID
   * @param {string} taskId - 任务ID
   * @param {string} taskTitle - 任务标题
   * @param {string} mentionedUserId - 被提醒用户ID
   * @param {string} mentionerUserId - 提醒者用户ID
   * @param {Object} io - Socket.io实例
   */
  static async notifyMention(teamId, taskId, taskTitle, mentionedUserId, mentionerUserId, io) {
    try {
      const content = `您在任务 "${taskTitle}" 中被提到`;
      
      await Message.createMessage({
        teamId,
        userId: mentionerUserId,
        eventType: EVENT_TYPES.MENTION,
        content,
        metadata: {
          targetUserId: mentionedUserId,
          taskId,
          operatorId: mentionerUserId
        },
        priority: 'medium',
        messageType: 'info'
      });

      // 发送实时通知
      if (io) {
        io.to(mentionedUserId.toString()).emit('notification', {
          type: 'mention',
          message: content,
          taskId,
          teamId
        });
      }
    } catch (error) {
      console.error('发送@提醒通知失败:', error);
    }
  }

  /**
   * 函数级注释：审计日志通知
   * @param {string} teamId - 团队ID
   * @param {string} action - 操作类型
   * @param {string} description - 操作描述
   * @param {string} operatorId - 操作者ID
   */
  static async createAuditLog(teamId, action, description, operatorId) {
    try {
      const operator = await User.findById(operatorId);
      const content = `审计日志: ${operator.name || operator.email} 执行了 ${action} - ${description}`;
      
      await Message.createMessage({
        teamId,
        eventType: EVENT_TYPES.AUDIT_LOG,
        content,
        userId: operatorId,
        metadata: {
          action,
          operatorId
        },
        priority: 'low',
        messageType: 'info'
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }
}

module.exports = MessageService;