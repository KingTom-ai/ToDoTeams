const Group = require('../../models/Group');
const TeamGroup = require('../../models/TeamGroup');
const Team = require('../../models/Team');
const Task = require('../../models/Task');

/**
 * 获取组列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // 构建查询条件
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // 计算分页
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // 查询组
    const groups = await Group.find(query)
      .populate('createdBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // 获取每个组的任务统计
    const groupsWithStats = await Promise.all(groups.map(async (group) => {
      const taskCount = await Task.countDocuments({ group: group.name });
      
      return {
        ...group.toObject(),
        taskCount
      };
    }));
    
    // 获取总数
    const total = await Group.countDocuments(query);
    
    res.json({
      groups: groupsWithStats,
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
 * 获取组详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getGroupById = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('createdBy', 'username email avatarUrl');
    
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // 获取组内任务
    const tasks = await Task.find({ group: group.name })
      .populate('userId', 'username')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // 获取任务统计
    const taskStats = await Task.aggregate([
      { $match: { group: group.name } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      group,
      tasks,
      taskStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 创建组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createGroup = async (req, res) => {
  try {
    const { name, description, color, permissions } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }
    
    // 检查组名是否已存在
    const existingGroup = await Group.findOne({ name });
    if (existingGroup) {
      return res.status(400).json({ error: 'Group name already exists' });
    }
    
    // 创建组
    const group = new Group({
      name,
      description,
      color,
      permissions: permissions || [],
      createdBy: req.user
    });
    
    await group.save();
    
    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'username email');
    
    res.status(201).json(populatedGroup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 更新组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateGroup = async (req, res) => {
  try {
    const { name, description, color, permissions } = req.body;
    const groupId = req.params.id;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // 构建更新数据
    const updateData = {};
    
    if (name && name !== group.name) {
      // 检查新名称是否已存在
      const existingGroup = await Group.findOne({ name });
      if (existingGroup) {
        return res.status(400).json({ error: 'Group name already exists' });
      }
      
      // 更新相关任务的组名
      await Task.updateMany(
        { group: group.name },
        { group: name }
      );
      
      updateData.name = name;
    }
    
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (permissions) updateData.permissions = permissions;
    
    // 更新组
    const updatedGroup = await Group.findByIdAndUpdate(
      groupId,
      updateData,
      { new: true }
    ).populate('createdBy', 'username email');
    
    res.json(updatedGroup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }
    
    // 检查是否有任务使用此组
    const taskCount = await Task.countDocuments({ group: group.name });
    if (taskCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete group. ${taskCount} tasks are using this group.`,
        taskCount
      });
    }
    
    // 删除组
    await Group.findByIdAndDelete(groupId);
    
    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取团队组列表
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTeamGroups = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, teamId, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // 构建查询条件
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (teamId) {
      query.teamId = teamId;
    }
    
    // 计算分页
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // 查询团队组
    const teamGroups = await TeamGroup.find(query)
      .populate('teamId', 'name teamID')
      .populate('createdBy', 'username email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // 获取每个团队组的任务统计
    const teamGroupsWithStats = await Promise.all(teamGroups.map(async (teamGroup) => {
      const taskCount = await Task.countDocuments({ 
        teamId: teamGroup.teamId,
        teamGroup: teamGroup.name 
      });
      
      return {
        ...teamGroup.toObject(),
        taskCount
      };
    }));
    
    // 获取总数
    const total = await TeamGroup.countDocuments(query);
    
    res.json({
      teamGroups: teamGroupsWithStats,
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
 * 获取团队组详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTeamGroupById = async (req, res) => {
  try {
    const teamGroup = await TeamGroup.findById(req.params.id)
      .populate('teamId', 'name teamID members')
      .populate('createdBy', 'username email avatarUrl');
    
    if (!teamGroup) {
      return res.status(404).json({ error: 'Team group not found' });
    }
    
    // 获取团队组内任务
    const tasks = await Task.find({ 
      teamId: teamGroup.teamId,
      teamGroup: teamGroup.name 
    })
      .populate('userId', 'username')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    
    // 获取任务统计
    const taskStats = await Task.aggregate([
      { 
        $match: { 
          teamId: teamGroup.teamId._id,
          teamGroup: teamGroup.name 
        } 
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      teamGroup,
      tasks,
      taskStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 创建团队组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createTeamGroup = async (req, res) => {
  try {
    const { name, description, color, teamId, permissions } = req.body;
    
    if (!name || !teamId) {
      return res.status(400).json({ error: 'Team group name and team ID are required' });
    }
    
    // 验证团队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // 检查团队组名在该团队内是否已存在
    const existingTeamGroup = await TeamGroup.findOne({ name, teamId });
    if (existingTeamGroup) {
      return res.status(400).json({ error: 'Team group name already exists in this team' });
    }
    
    // 创建团队组
    const teamGroup = new TeamGroup({
      name,
      description,
      color,
      teamId,
      permissions: permissions || [],
      createdBy: req.user
    });
    
    await teamGroup.save();
    
    const populatedTeamGroup = await TeamGroup.findById(teamGroup._id)
      .populate('teamId', 'name teamID')
      .populate('createdBy', 'username email');
    
    res.status(201).json(populatedTeamGroup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 更新团队组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateTeamGroup = async (req, res) => {
  try {
    const { name, description, color, permissions } = req.body;
    const teamGroupId = req.params.id;
    
    const teamGroup = await TeamGroup.findById(teamGroupId);
    if (!teamGroup) {
      return res.status(404).json({ error: 'Team group not found' });
    }
    
    // 构建更新数据
    const updateData = {};
    
    if (name && name !== teamGroup.name) {
      // 检查新名称在该团队内是否已存在
      const existingTeamGroup = await TeamGroup.findOne({ 
        name, 
        teamId: teamGroup.teamId,
        _id: { $ne: teamGroupId }
      });
      if (existingTeamGroup) {
        return res.status(400).json({ error: 'Team group name already exists in this team' });
      }
      
      // 更新相关任务的团队组名
      await Task.updateMany(
        { 
          teamId: teamGroup.teamId,
          teamGroup: teamGroup.name 
        },
        { teamGroup: name }
      );
      
      updateData.name = name;
    }
    
    if (description !== undefined) updateData.description = description;
    if (color) updateData.color = color;
    if (permissions) updateData.permissions = permissions;
    
    // 更新团队组
    const updatedTeamGroup = await TeamGroup.findByIdAndUpdate(
      teamGroupId,
      updateData,
      { new: true }
    ).populate('teamId', 'name teamID')
     .populate('createdBy', 'username email');
    
    res.json(updatedTeamGroup);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除团队组
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteTeamGroup = async (req, res) => {
  try {
    const teamGroupId = req.params.id;
    
    const teamGroup = await TeamGroup.findById(teamGroupId);
    if (!teamGroup) {
      return res.status(404).json({ error: 'Team group not found' });
    }
    
    // 检查是否有任务使用此团队组
    const taskCount = await Task.countDocuments({ 
      teamId: teamGroup.teamId,
      teamGroup: teamGroup.name 
    });
    if (taskCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete team group. ${taskCount} tasks are using this team group.`,
        taskCount
      });
    }
    
    // 删除团队组
    await TeamGroup.findByIdAndDelete(teamGroupId);
    
    res.json({ message: 'Team group deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  // 组管理
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  
  // 团队组管理
  getTeamGroups,
  getTeamGroupById,
  createTeamGroup,
  updateTeamGroup,
  deleteTeamGroup
};