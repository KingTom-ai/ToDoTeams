const User = require('../../models/User');
const Team = require('../../models/Team');
const Task = require('../../models/Task');
const { Message } = require('../../models/Message');

/**
 * 获取用户活跃度统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUserActivityStats = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // 计算时间范围
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateRange = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }
    
    // 用户注册趋势
    const userRegistrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // 活跃用户统计（基于任务创建和消息发送）
    const activeUsers = await Task.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: '$userId',
          taskCount: { $sum: 1 },
          lastActivity: { $max: '$createdAt' }
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
          taskCount: 1,
          lastActivity: 1
        }
      },
      {
        $sort: { taskCount: -1 }
      },
      {
        $limit: 20
      }
    ]);
    
    // 用户角色分布
    const userRoleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 用户状态统计
    const totalUsers = await User.countDocuments();
    const activeUsersCount = await User.countDocuments({
      lastLogin: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    });
    
    res.json({
      period,
      dateRange,
      summary: {
        totalUsers,
        activeUsers: activeUsersCount,
        inactiveUsers: totalUsers - activeUsersCount,
        newUsers: userRegistrationTrend.reduce((sum, item) => sum + item.count, 0)
      },
      registrationTrend: userRegistrationTrend,
      topActiveUsers: activeUsers,
      roleDistribution: userRoleDistribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取团队绩效统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTeamPerformanceStats = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // 计算时间范围
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateRange = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }
    
    // 团队任务完成统计
    const teamTaskStats = await Task.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $lookup: {
          from: 'teams',
          localField: 'teamId',
          foreignField: '_id',
          as: 'team'
        }
      },
      {
        $unwind: '$team'
      },
      {
        $group: {
          _id: {
            teamId: '$teamId',
            teamName: '$team.name',
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            teamId: '$_id.teamId',
            teamName: '$_id.teamName'
          },
          tasks: {
            $push: {
              status: '$_id.status',
              count: '$count'
            }
          },
          totalTasks: { $sum: '$count' }
        }
      },
      {
        $sort: { totalTasks: -1 }
      }
    ]);
    
    // 计算团队完成率
    const teamPerformance = teamTaskStats.map(team => {
      const completedTasks = team.tasks.find(t => t.status === 'completed')?.count || 0;
      const completionRate = team.totalTasks > 0 ? (completedTasks / team.totalTasks * 100).toFixed(2) : 0;
      
      return {
        teamId: team._id.teamId,
        teamName: team._id.teamName,
        totalTasks: team.totalTasks,
        completedTasks,
        completionRate: parseFloat(completionRate),
        taskBreakdown: team.tasks
      };
    });
    
    // 团队成员活跃度
    const teamMemberActivity = await Team.aggregate([
      {
        $lookup: {
          from: 'tasks',
          let: { teamId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$teamId', '$$teamId'] },
                createdAt: dateRange
              }
            },
            {
              $group: {
                _id: '$userId',
                taskCount: { $sum: 1 }
              }
            }
          ],
          as: 'memberActivity'
        }
      },
      {
        $project: {
          name: 1,
          teamID: 1,
          memberCount: { $size: '$members' },
          activeMemberCount: { $size: '$memberActivity' },
          memberActivity: 1
        }
      }
    ]);
    
    // 团队创建趋势
    const teamCreationTrend = await Team.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    res.json({
      period,
      dateRange,
      teamPerformance,
      teamMemberActivity,
      teamCreationTrend,
      summary: {
        totalTeams: teamPerformance.length,
        averageCompletionRate: teamPerformance.length > 0 
          ? (teamPerformance.reduce((sum, team) => sum + team.completionRate, 0) / teamPerformance.length).toFixed(2)
          : 0,
        topPerformingTeam: teamPerformance[0] || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取任务趋势统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getTaskTrendStats = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // 计算时间范围
    let dateRange = {};
    if (startDate && endDate) {
      dateRange = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      dateRange = {
        $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };
    }
    
    // 任务创建趋势
    const taskCreationTrend = await Task.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // 任务完成趋势
    const taskCompletionTrend = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          updatedAt: dateRange
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$updatedAt' },
            month: { $month: '$updatedAt' },
            day: { $dayOfMonth: '$updatedAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
      }
    ]);
    
    // 任务状态分布
    const taskStatusDistribution = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 任务优先级分布
    const taskPriorityDistribution = await Task.aggregate([
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 逾期任务统计
    const overdueTasks = await Task.countDocuments({
      dueDate: { $lt: new Date() },
      status: { $ne: 'completed' }
    });
    
    // 平均任务完成时间
    const avgCompletionTime = await Task.aggregate([
      {
        $match: {
          status: 'completed',
          updatedAt: dateRange
        }
      },
      {
        $project: {
          completionTime: {
            $subtract: ['$updatedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTime: { $avg: '$completionTime' }
        }
      }
    ]);
    
    // 任务分配统计
    const taskAssignmentStats = await Task.aggregate([
      {
        $match: {
          createdAt: dateRange
        }
      },
      {
        $group: {
          _id: '$assignedTo',
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
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
          taskCount: 1,
          completedCount: 1,
          completionRate: {
            $cond: [
              { $gt: ['$taskCount', 0] },
              { $multiply: [{ $divide: ['$completedCount', '$taskCount'] }, 100] },
              0
            ]
          }
        }
      },
      {
        $sort: { taskCount: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    res.json({
      period,
      dateRange,
      creationTrend: taskCreationTrend,
      completionTrend: taskCompletionTrend,
      statusDistribution: taskStatusDistribution,
      priorityDistribution: taskPriorityDistribution,
      assignmentStats: taskAssignmentStats,
      summary: {
        totalTasks: await Task.countDocuments(),
        completedTasks: await Task.countDocuments({ status: 'completed' }),
        overdueTasks,
        avgCompletionTimeHours: avgCompletionTime[0] 
          ? Math.round(avgCompletionTime[0].avgTime / (1000 * 60 * 60))
          : 0
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 获取综合仪表板统计
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 基础统计
    const totalUsers = await User.countDocuments();
    const totalTeams = await Team.countDocuments();
    const totalTasks = await Task.countDocuments();
    const totalMessages = await Message.countDocuments();
    
    // 今日统计
    const todayStats = {
      newUsers: await User.countDocuments({ createdAt: { $gte: today } }),
      newTeams: await Team.countDocuments({ createdAt: { $gte: today } }),
      newTasks: await Task.countDocuments({ createdAt: { $gte: today } }),
      completedTasks: await Task.countDocuments({ 
        status: 'completed',
        updatedAt: { $gte: today }
      })
    };
    
    // 本周统计
    const weekStats = {
      newUsers: await User.countDocuments({ createdAt: { $gte: thisWeek } }),
      newTeams: await Team.countDocuments({ createdAt: { $gte: thisWeek } }),
      newTasks: await Task.countDocuments({ createdAt: { $gte: thisWeek } }),
      completedTasks: await Task.countDocuments({ 
        status: 'completed',
        updatedAt: { $gte: thisWeek }
      })
    };
    
    // 本月统计
    const monthStats = {
      newUsers: await User.countDocuments({ createdAt: { $gte: thisMonth } }),
      newTeams: await Team.countDocuments({ createdAt: { $gte: thisMonth } }),
      newTasks: await Task.countDocuments({ createdAt: { $gte: thisMonth } }),
      completedTasks: await Task.countDocuments({ 
        status: 'completed',
        updatedAt: { $gte: thisMonth }
      })
    };
    
    // 活跃度统计
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: thisWeek }
    });
    
    // 任务状态概览
    const taskStatusOverview = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 最近活动
    const recentActivities = {
      recentUsers: await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('username email createdAt'),
      recentTeams: await Team.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name teamID createdAt')
        .populate('createdBy', 'username'),
      recentTasks: await Task.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title status priority createdAt')
        .populate('userId', 'username')
    };
    
    res.json({
      totals: {
        users: totalUsers,
        teams: totalTeams,
        tasks: totalTasks,
        messages: totalMessages
      },
      today: todayStats,
      week: weekStats,
      month: monthStats,
      activeUsers,
      taskStatusOverview,
      recentActivities,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 生成报告
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const generateReport = async (req, res) => {
  try {
    const { type, period = '30d', format = 'json' } = req.body;
    
    if (!type) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    let reportData = {};
    
    switch (type) {
      case 'user_activity':
        // 重用用户活跃度统计逻辑
        const userActivityReq = { query: { period } };
        const userActivityRes = {
          json: (data) => { reportData = data; }
        };
        await getUserActivityStats(userActivityReq, userActivityRes);
        break;
        
      case 'team_performance':
        // 重用团队绩效统计逻辑
        const teamPerformanceReq = { query: { period } };
        const teamPerformanceRes = {
          json: (data) => { reportData = data; }
        };
        await getTeamPerformanceStats(teamPerformanceReq, teamPerformanceRes);
        break;
        
      case 'task_trends':
        // 重用任务趋势统计逻辑
        const taskTrendsReq = { query: { period } };
        const taskTrendsRes = {
          json: (data) => { reportData = data; }
        };
        await getTaskTrendStats(taskTrendsReq, taskTrendsRes);
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    // 添加报告元数据
    const report = {
      type,
      period,
      generatedAt: new Date().toISOString(),
      generatedBy: req.user.username,
      data: reportData
    };
    
    if (format === 'json') {
      res.json(report);
    } else {
      // 其他格式（CSV, PDF等）可以在这里实现
      res.status(400).json({ error: 'Unsupported format' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUserActivityStats,
  getTeamPerformanceStats,
  getTaskTrendStats,
  getDashboardStats,
  generateReport
};