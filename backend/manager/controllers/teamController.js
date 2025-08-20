const Team = require('../../models/Team');
const User = require('../../models/User');
const Task = require('../../models/Task');
const { Message } = require('../../models/Message');
const MessageService = require('../../services/messageService');

/**
 * 获取团队列表（包括成员数、任务数）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTeams = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // 构建查询条件
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { teamID: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // 查询团队
    const teams = await Team.find(query)
      .populate('owner', 'username email')
      .populate('members.user', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // 获取每个团队的任务统计
    const teamsWithStats = await Promise.all(teams.map(async (team) => {
      const taskCount = await Task.countDocuments({ teamId: team._id });
      const completedTasks = await Task.countDocuments({ teamId: team._id, status: 'completed' });
      
      return {
        ...team.toObject(),
        memberCount: team.members.length,
        taskCount,
        completedTasks,
        completionRate: taskCount > 0 ? Math.round((completedTasks / taskCount) * 100) : 0
      };
    }));
    
    // 获取总数
    const total = await Team.countDocuments(query);
    
    res.json({
      teams: teamsWithStats,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        count: total,
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取团队详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('owner', 'username email avatarUrl')
      .populate('members.user', 'username email avatarUrl createdAt');
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 获取团队任务统计
    const taskStats = await Task.aggregate([
      { $match: { teamId: team._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 获取团队最近的任务
    const recentTasks = await Task.find({ teamId: team._id })
      .populate('userId', 'username')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
    
    // 获取团队消息统计
    const messageCount = await Message.countDocuments({ teamId: team._id });
    
    res.json({
      team,
      taskStats,
      recentTasks,
      messageCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 创建团队
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createTeam = async (req, res) => {
  try {
    const { name, ownerId, description } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Team name and owner are required' });
    }
    
    // 验证所有者是否存在
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    // 生成团队ID
    const crypto = require('crypto');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(11);
    let teamID = '';
    for (let i = 0; i < 11; i++) {
      teamID += chars[bytes[i] % chars.length];
    }
    
    // 创建团队
    const team = new Team({
      name,
      teamID,
      description,
      owner: ownerId,
      members: [{ user: ownerId, role: 'creator' }]
    });
    
    await team.save();
    
    // 更新用户的团队列表
    await User.findByIdAndUpdate(ownerId, {
      $push: { teams: team._id }
    });
    
    // 发送团队创建通知
    await MessageService.notifyTeamCreation(team._id, team.name, req.user);
    
    const populatedTeam = await Team.findById(team._id)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');
    
    res.status(201).json(populatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 更新团队
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateTeam = async (req, res) => {
  try {
    const { name, description, ownerId } = req.body;
    const teamId = req.params.id;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 构建更新数据
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    
    // 如果要更换所有者
    if (ownerId && ownerId !== team.owner.toString()) {
      const newOwner = await User.findById(ownerId);
      if (!newOwner) {
        return res.status(404).json({ error: 'New owner not found' });
      }
      
      // 检查新所有者是否已经是团队成员
      const isMember = team.members.some(m => m.user.toString() === ownerId);
      if (!isMember) {
        team.members.push({ user: ownerId, role: 'creator' });
        await User.findByIdAndUpdate(ownerId, {
          $push: { teams: team._id }
        });
      } else {
        // 更新现有成员的角色
        const memberIndex = team.members.findIndex(m => m.user.toString() === ownerId);
        team.members[memberIndex].role = 'creator';
      }
      
      // 将原所有者角色改为管理员
      const oldOwnerIndex = team.members.findIndex(m => m.user.toString() === team.owner.toString());
      if (oldOwnerIndex !== -1) {
        team.members[oldOwnerIndex].role = 'manager';
      }
      
      updateData.owner = ownerId;
    }
    
    // 更新团队
    const updatedTeam = await Team.findByIdAndUpdate(
      teamId,
      updateData,
      { new: true }
    ).populate('owner', 'username email')
     .populate('members.user', 'username email');
    
    // 如果有成员变更，保存团队
    if (ownerId && ownerId !== team.owner.toString()) {
      await team.save();
    }
    
    res.json(updatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除团队
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteTeam = async (req, res) => {
  try {
    const teamId = req.params.id;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 获取团队成员ID列表
    const memberIds = team.members.map(m => m.user.toString());
    
    // 发送团队删除通知
    await MessageService.notifyTeamDeletion(team._id, team.name, req.user, memberIds);
    
    // 删除团队相关数据
    await Task.deleteMany({ teamId: teamId });
    await Message.deleteMany({ teamId: teamId });
    
    // 从用户的团队列表中移除
    await User.updateMany(
      { teams: teamId },
      { $pull: { teams: teamId } }
    );
    
    // 删除团队
    await Team.findByIdAndDelete(teamId);
    
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 添加团队成员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const addMember = async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const teamId = req.params.id;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 检查用户是否已经是团队成员
    const isMember = team.members.some(m => m.user.toString() === userId);
    if (isMember) {
      return res.status(400).json({ error: 'User is already a team member' });
    }
    
    // 添加成员
    team.members.push({ user: userId, role });
    await team.save();
    
    // 更新用户的团队列表
    await User.findByIdAndUpdate(userId, {
      $push: { teams: teamId }
    });
    
    // 发送成员加入通知
    await MessageService.notifyMemberJoin(teamId, userId, team.owner);
    
    const updatedTeam = await Team.findById(teamId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');
    
    res.json(updatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 移除团队成员
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const removeMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const teamId = req.params.id;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 检查成员是否存在
    const memberIndex = team.members.findIndex(m => m.user.toString() === userId);
    if (memberIndex === -1) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const member = team.members[memberIndex];
    
    // 防止移除创建者
    if (member.role === 'creator') {
      return res.status(403).json({ error: 'Cannot remove team creator' });
    }
    
    // 移除成员
    team.members.splice(memberIndex, 1);
    await team.save();
    
    // 从用户的团队列表中移除
    await User.findByIdAndUpdate(userId, {
      $pull: { teams: teamId }
    });
    
    // 发送成员移除通知
    await MessageService.notifyMemberLeave(teamId, userId, req.user, true);
    
    res.json({ message: 'Member removed successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 更新成员角色
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, permissions } = req.body;
    const teamId = req.params.id;
    
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 查找成员
    const member = team.members.find(m => m.user.toString() === userId);
    if (!member) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const oldRole = member.role;
    
    // 更新角色和权限
    if (role) member.role = role;
    if (permissions) member.permissions = permissions;
    
    await team.save();
    
    // 发送角色变更通知
    if (role && role !== oldRole) {
      await MessageService.notifyRoleChange(teamId, userId, oldRole, role, req.user);
    }
    
    if (permissions) {
      await MessageService.notifyPermissionChange(teamId, userId, '团队权限', true, req.user);
    }
    
    const updatedTeam = await Team.findById(teamId)
      .populate('owner', 'username email')
      .populate('members.user', 'username email');
    
    res.json(updatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateMemberRole
};