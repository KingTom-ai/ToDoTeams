const Task = require('../../models/Task');
const Team = require('../../models/Team');
const User = require('../../models/User');
const MessageService = require('../../services/messageService');

/**
 * 获取所有任务列表（跨团队、状态过滤）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTasks = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      status, 
      priority, 
      teamId, 
      userId,
      assignedTo,
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      dateFrom,
      dateTo
    } = req.query;
    
    // 构建查询条件
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (priority) {
      query.priority = priority;
    }
    
    if (teamId) {
      query.teamId = teamId;
    }
    
    if (userId) {
      query.userId = userId;
    }
    
    if (assignedTo) {
      query.assignedTo = assignedTo;
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
    
    // 查询任务
    let query_builder = Task.find(query)
      .populate('userId', 'username email')
      .populate('assignedTo', 'username email')
      .populate('teamId', 'name teamID')
      .sort(sort)
      .skip(skip);
    
    // 如果limit为0，则不限制数量
    if (parsedLimit > 0) {
      query_builder = query_builder.limit(parsedLimit);
    }
    
    const tasks = await query_builder;
    
    // 获取总数
    const total = await Task.countDocuments(query);
    
    res.json({
      tasks,
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
 * 获取任务详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('userId', 'username email avatarUrl')
      .populate('assignedTo', 'username email avatarUrl')
      .populate('teamId', 'name teamID members')
      .populate('comments.userId', 'username avatarUrl');
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 更新任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // 记录状态变更
    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo;
    
    // 更新任务
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      updateData,
      { new: true }
    ).populate([
      { path: 'userId', select: 'username email' },
      { path: 'assignedTo', select: 'username email' },
      { path: 'teamId', select: 'name teamID' }
    ]);
    
    // 发送状态变更通知
    if (updateData.status && updateData.status !== oldStatus) {
      if (task.teamId) {
        await MessageService.notifyTaskStatusChange(
          task.teamId,
          taskId,
          task.title,
          oldStatus,
          updateData.status,
          req.user
        );
      }
    }
    
    // 发送任务重新分配通知
    if (updateData.assignedTo && updateData.assignedTo !== oldAssignedTo?.toString()) {
      if (task.teamId) {
        await MessageService.notifyTaskAssignment(
          task.teamId,
          taskId,
          task.title,
          updateData.assignedTo,
          req.user
        );
      }
    }
    
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // 发送任务删除通知
    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        const memberIds = team.members.map(m => m.user.toString());
        await MessageService.notifyTaskDeletion(
          task.teamId,
          taskId,
          task.title,
          req.user,
          memberIds
        );
      }
    }
    
    // 删除任务
    await Task.findByIdAndDelete(taskId);
    
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取任务统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTaskStats = async (req, res) => {
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
    
    // 总任务数
    const totalTasks = await Task.countDocuments(baseQuery);
    
    // 按状态统计
    const statusStats = await Task.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 按优先级统计
    const priorityStats = await Task.aggregate([
      { $match: baseQuery },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 逾期任务统计
    const overdueTasks = await Task.countDocuments({
      ...baseQuery,
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
    
    // 完成率
    const completedTasks = await Task.countDocuments({
      ...baseQuery,
      status: 'completed'
    });
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // 按团队统计（如果没有指定团队）
    let teamStats = [];
    if (!teamId) {
      teamStats = await Task.aggregate([
        { $match: { ...baseQuery, teamId: { $exists: true } } },
        {
          $group: {
            _id: '$teamId',
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
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
            totalTasks: '$count',
            completedTasks: '$completed',
            completionRate: {
              $round: [{ $multiply: [{ $divide: ['$completed', '$count'] }, 100] }, 0]
            }
          }
        }
      ]);
    }
    
    // 按用户统计（如果没有指定用户）
    let userStats = [];
    if (!userId) {
      userStats = await Task.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
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
            totalTasks: '$count',
            completedTasks: '$completed',
            completionRate: {
              $round: [{ $multiply: [{ $divide: ['$completed', '$count'] }, 100] }, 0]
            }
          }
        },
        { $sort: { totalTasks: -1 } },
        { $limit: 10 }
      ]);
    }
    
    // 每日任务创建趋势（最近30天）
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyStats = await Task.aggregate([
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
    
    res.json({
      summary: {
        totalTasks,
        completedTasks,
        overdueTasks,
        completionRate
      },
      statusStats,
      priorityStats,
      teamStats,
      userStats,
      dailyStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 批量更新任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const batchUpdateTasks = async (req, res) => {
  try {
    const { taskIds, updateData } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs are required' });
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Update data is required' });
    }
    
    // 批量更新任务
    const result = await Task.updateMany(
      { _id: { $in: taskIds } },
      updateData
    );
    
    // 获取更新后的任务
    const updatedTasks = await Task.find({ _id: { $in: taskIds } })
      .populate('userId', 'username email')
      .populate('assignedTo', 'username email')
      .populate('teamId', 'name teamID');
    
    // 发送批量更新通知
    if (updateData.status) {
      for (const task of updatedTasks) {
        if (task.teamId) {
          await MessageService.notifyTaskStatusChange(
            task.teamId,
            task._id,
            task.title,
            'unknown', // 批量操作时无法获取原状态
            updateData.status,
            req.user
          );
        }
      }
    }
    
    res.json({
      message: `${result.modifiedCount} tasks updated successfully`,
      updatedTasks
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 批量删除任务
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const batchDeleteTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Task IDs are required' });
    }
    
    // 获取要删除的任务信息（用于发送通知）
    const tasksToDelete = await Task.find({ _id: { $in: taskIds } })
      .populate('teamId', 'name members');
    
    // 发送删除通知
    for (const task of tasksToDelete) {
      if (task.teamId) {
        const memberIds = task.teamId.members.map(m => m.user.toString());
        await MessageService.notifyTaskDeletion(
          task.teamId._id,
          task._id,
          task.title,
          req.user,
          memberIds
        );
      }
    }
    
    // 批量删除任务
    const result = await Task.deleteMany({ _id: { $in: taskIds } });
    
    res.json({
      message: `${result.deletedCount} tasks deleted successfully`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
  getTaskStats,
  batchUpdateTasks,
  batchDeleteTasks
};