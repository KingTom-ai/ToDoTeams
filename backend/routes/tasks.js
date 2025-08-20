const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const Team = require('../models/Team');
const User = require('../models/User');
const { Message } = require('../models/Message');
const MessageService = require('../services/messageService');
const redis = require('../config/redis');
const connectRabbitMQ = require('../config/rabbitmq');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 设置multer存储
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    try {
      // 获取任务信息
      const task = await Task.findById(req.params.id).populate('teamId');
      if (!task) {
        return cb(new Error('Task not found'));
      }

      let uploadPath;
      if (task.teamId) {
        // 团队任务：按照 team name/group/child group/task 结构
        const teamName = task.teamId.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'); // 清理团队名称中的特殊字符
        const group = task.teamGroup || 'ungrouped';
        const taskTitle = task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_'); // 清理任务标题中的特殊字符
        
        // 构建路径：uploads/teams/teamName/group/taskTitle
        uploadPath = path.join(__dirname, '..', 'uploads', 'teams', teamName, group, taskTitle);
      } else {
        // 个人任务：按照原有结构
        const group = task.group || 'ungrouped';
        const taskTitle = task.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
        
        // 构建路径：uploads/personal/group/taskTitle
        uploadPath = path.join(__dirname, '..', 'uploads', 'personal', group, taskTitle);
      }

      // 递归创建目录
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // 保持原有的文件命名方式
    cb(null, Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
  }
});
const upload = multer({ storage: storage });

let channel = null;

// 初始化RabbitMQ连接
(async () => {
  try {
    channel = await connectRabbitMQ();
    console.log('RabbitMQ connected successfully');
  } catch (err) {
    console.log('RabbitMQ connection failed:', err.message);
  }
})();

// 获取个人任务（排除团队任务）
router.get('/', auth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'test') {
      const tasks = await Task.find({ userId: req.user, teamId: { $exists: false } });
      return res.json(tasks);
    }
    const cacheKey = `tasks_${req.user}`;
    const cachedTasks = await redis.get(cacheKey);
    if (cachedTasks) {
      return res.json(JSON.parse(cachedTasks));
    }
    // 只获取个人任务，排除团队任务
    const tasks = await Task.find({ userId: req.user, teamId: { $exists: false } });
    await redis.set(cacheKey, JSON.stringify(tasks), 'EX', 3600);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取团队任务
router.get('/team/:teamId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    if (!team.members.some(m => m.user.toString() === req.user)) return res.status(403).json({ msg: 'Not authorized' });
    const tasks = await Task.find({ teamId: req.params.teamId }).populate([
      { path: 'teamId', select: 'name' },
      { path: 'assignedTo', select: 'username' },
      { path: 'userId', select: 'username' }
    ]);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建任务
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating task with data:', req.body);
    console.log('User ID:', req.user);
    const { title, description, dueDate, group, teamGroup, teamId } = req.body;
    
    if (!title) {
      console.log('Error: Title is required');
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const taskData = { title, description, dueDate, userId: req.user };
    
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team || !team.members.some(m => m.user.toString() === req.user)) {
        return res.status(403).json({ msg: 'Not authorized to create task in this team' });
      }
      taskData.teamId = teamId;
      taskData.teamGroup = teamGroup || 'ungrouped';
    } else {
      taskData.group = group || 'ungrouped';
    }
    const task = new Task(taskData);
    await task.save();
    console.log('Task created successfully:', task);
    
    // 如果是团队任务，需要populate相关字段以保持数据格式一致
    let populatedTask = task;
    if (teamId) {
      populatedTask = await Task.findById(task._id).populate([
        { path: 'teamId', select: 'name' },
        { path: 'assignedTo', select: 'username' },
        { path: 'userId', select: 'username' }
      ]);
    }
    
    if (channel && channel.sendToQueue) {
      await channel.sendToQueue('task_updates', Buffer.from(JSON.stringify({ action: 'create', task: populatedTask })));
    }
    await redis.del(`tasks_${req.user}`);
    req.app.get('io').to(req.user).emit('taskUpdate', { action: 'create', task: populatedTask });
    res.status(201).json(populatedTask);
  } catch (err) {
    console.log('Error creating task:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// 分配任务的路由处理函数，并添加消息
router.put('/:id/assign', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (!task.teamId) return res.status(400).json({ msg: 'Not a team task' });
    const team = await Team.findById(task.teamId);
    const requester = team.members.find(m => m.user.toString() === req.user);
    if (requester.role !== 'admin') return res.status(403).json({ msg: 'Not authorized' });
    const assignedUser = req.body.assignedTo;
    if (!team.members.some(m => m.user.toString() === assignedUser)) return res.status(400).json({ msg: 'User not in team' });
    task.assignedTo = assignedUser;
    await task.save();
    
    // 使用MessageService发送任务分配通知
    await MessageService.notifyTaskAssignment(task.teamId, task._id, task.title, assignedUser, req.user);
    
    const content = `您已被分配到任务: ${task.title}`;
    req.app.get('io').to(assignedUser).emit('notification', { message: content });
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 添加评论并处理@提醒，并添加消息
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.userId.toString() !== req.user && !task.teamId) return res.status(401).json({ msg: 'Not authorized' });
    const newComment = {
      text: req.body.text,
      userId: req.user
    };
    task.comments.push(newComment);
    await task.save();
    const updatedTask = await Task.findById(req.params.id).populate({
      path: 'comments.userId',
      select: 'username'
    });
    // 处理@提醒
    const mentions = req.body.text.match(/@(\w+)/g) || [];
    for (let mention of mentions) {
      const username = mention.slice(1);
      const user = await User.findOne({ username });
      if (user && task.teamId) {
        await MessageService.notifyMention(
          task.teamId,
          task._id,
          task.title,
          user._id,
          req.user,
          req.app.get('io')
        );
      }
    }
    res.json(updatedTask.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新任务
router.put('/:id', auth, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // 根据任务类型处理分组字段
    const existingTask = await Task.findById(req.params.id);
    if (!existingTask) return res.status(404).json({ msg: 'Task not found' });

    // 添加权限检查
    let isAuthorized = false;
    if (existingTask.teamId) {
      const team = await Team.findById(existingTask.teamId);
      if (team) {
        const member = team.members.find(m => m.user.toString() === req.user);
        if (member && member.permissions.write) {
          isAuthorized = true;
        }
      }
    } else {
      if (existingTask.userId.toString() === req.user) {
        isAuthorized = true;
      }
    }
    if (!isAuthorized) return res.status(403).json({ msg: 'Not authorized to update this task' });
    
    if (existingTask.teamId) {
      // 团队任务：更新teamGroup字段
      if (req.body.group) {
        updateData.teamGroup = req.body.group;
        delete updateData.group;
      }
    } else {
      // 个人任务：更新group字段
      if (req.body.teamGroup) {
        updateData.group = req.body.teamGroup;
        delete updateData.teamGroup;
      }
    }
    
    const task = await Task.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    // 如果是团队任务，需要populate相关字段以保持数据格式一致
    let populatedTask = task;
    if (task.teamId) {
      populatedTask = await Task.findById(task._id).populate([
        { path: 'teamId', select: 'name' },
        { path: 'assignedTo', select: 'username' },
        { path: 'userId', select: 'username' }
      ]);
    }
    
    if (channel && channel.sendToQueue) {
      await channel.sendToQueue('task_updates', Buffer.from(JSON.stringify({ action: 'update', task: populatedTask })));
    }
    await redis.del(`tasks_${task.userId}`);
    res.json(populatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 删除任务
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('Deleting task with ID:', req.params.id);
    console.log('User ID:', req.user);
    
    const task = await Task.findById(req.params.id);
    if (!task) {
      console.log('Task not found with ID:', req.params.id);
      return res.status(404).json({ msg: 'Task not found' });
    }
    
    // 检查任务是否属于当前用户
    if (task.userId.toString() !== req.user.toString()) {
      console.log('User not authorized to delete this task');
      return res.status(403).json({ msg: 'Not authorized to delete this task' });
    }
    
    await Task.findByIdAndDelete(req.params.id);
    console.log('Task deleted successfully:', req.params.id);
    
    if (channel && channel.sendToQueue) {
      await channel.sendToQueue('task_updates', Buffer.from(JSON.stringify({ action: 'delete', taskId: req.params.id })));
    }
    await redis.del(`tasks_${task.userId}`);
    res.json({ msg: 'Task deleted' });
  } catch (err) {
    console.log('Error deleting task:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 添加评论
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.userId.toString() !== req.user) return res.status(401).json({ msg: 'Not authorized' });
    const newComment = {
      text: req.body.text,
      userId: req.user
    };
    task.comments.push(newComment);
    await task.save();
    const updatedTask = await Task.findById(req.params.id).populate({
      path: 'comments.userId',
      select: 'username'
    });
    res.json(updatedTask.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取评论
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let isAuthorized = task.userId.toString() === req.user;
    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team && team.members.some(m => m.user.toString() === req.user)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) return res.status(401).json({ msg: 'Not authorized' });

    const populatedTask = await Task.findById(req.params.id).populate({
      path: 'comments.userId',
      select: 'username'
    });
    res.json(populatedTask.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 添加步骤
router.post('/:id/steps', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    const newStep = {
      text: req.body.text,
      completed: false,
      order: task.steps.length
    };
    task.steps.push(newStep);
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 更新步骤完成状态
router.put('/:id/steps/:stepId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.userId.toString() !== req.user) return res.status(401).json({ msg: 'Not authorized' });
    const step = task.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });
    step.completed = req.body.completed;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 重新排序步骤
router.put('/:id/steps/reorder', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.userId.toString() !== req.user) return res.status(401).json({ msg: 'Not authorized' });
    const orderedStepIds = req.body.orderedStepIds;
    if (!Array.isArray(orderedStepIds)) return res.status(400).json({ msg: 'Invalid orderedStepIds' });
    const newSteps = [];
    orderedStepIds.forEach((stepId, index) => {
      const step = task.steps.id(stepId);
      if (step) {
        step.order = index + 1;
        newSteps.push(step);
      }
    });
    task.steps = newSteps;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取步骤
router.get('/:id/steps', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let isAuthorized = task.userId.toString() === req.user;
    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team && team.members.some(m => m.user.toString() === req.user)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) return res.status(401).json({ msg: 'Not authorized' });

    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 上传附件
router.post('/:id/attachments', auth, upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const filename = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

    // 将绝对路径转换为相对路径，用于前端访问
    const relativePath = path.relative(path.join(__dirname, '../uploads'), req.file.path).replace(/\\/g, '/');
    
    const attachment = {
      filename: filename,
      path: relativePath, // 存储相对路径
      size: req.file.size,
      mimetype: req.file.mimetype,
      uploadedBy: req.user
    };

    task.attachments.push(attachment);
    await task.save();
    res.json(task.attachments);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 获取附件
router.get('/:id/attachments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let isAuthorized = task.userId.toString() === req.user;
    if (task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team && team.members.some(m => m.user.toString() === req.user)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) return res.status(401).json({ msg: 'Not authorized' });

    res.json(task.attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 下载附件
router.get('/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    
    // 权限验证：个人任务或团队任务成员
    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });
    
    const attachment = task.attachments.id(req.params.attachmentId);
    if (!attachment) return res.status(404).json({ msg: 'Attachment not found' });
    
    // 构建完整的文件路径
    const fullPath = path.join(__dirname, '../uploads', attachment.path);
    
    // 检查文件是否存在
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ msg: 'File not found on disk' });
    }
    
    res.sendFile(path.resolve(fullPath));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新步骤文本
router.put('/:id/steps/:stepId/text', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });
    if (task.userId.toString() !== req.user) return res.status(401).json({ msg: 'Not authorized' });
    const step = task.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });
    step.text = req.body.text;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除附件
router.delete('/:id/attachments/:attachmentId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });

    const attachmentIndex = task.attachments.findIndex(att => att._id.toString() === req.params.attachmentId);
    if (attachmentIndex === -1) return res.status(404).json({ msg: 'Attachment not found' });
    const attachment = task.attachments[attachmentIndex];
    // 删除文件 - 构建完整路径
    const fullPath = path.join(__dirname, '../uploads', attachment.path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    // 从数组中移除
    task.attachments.splice(attachmentIndex, 1);
    await task.save();
    res.json(task.attachments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除步骤
router.delete('/:id/steps/:stepId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });

    const stepIndex = task.steps.findIndex(s => s._id.toString() === req.params.stepId);
    if (stepIndex === -1) return res.status(404).json({ msg: 'Step not found' });
    task.steps.splice(stepIndex, 1);
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新步骤文本
router.put('/:id/steps/:stepId/text', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });

    const step = task.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });
    step.text = req.body.text;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新步骤完成状态
router.put('/:id/steps/:stepId', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });

    const step = task.steps.id(req.params.stepId);
    if (!step) return res.status(404).json({ msg: 'Step not found' });
    step.completed = req.body.completed;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 重新排序步骤
router.put('/:id/steps/reorder', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ msg: 'Task not found' });

    let authorized = task.userId.toString() === req.user;
    if (!authorized && task.teamId) {
      const team = await Team.findById(task.teamId);
      if (team) {
        authorized = team.members.some(member => member.user.toString() === req.user);
      }
    }
    if (!authorized) return res.status(401).json({ msg: 'Not authorized' });

    const orderedStepIds = req.body.orderedStepIds;
    if (!Array.isArray(orderedStepIds)) return res.status(400).json({ msg: 'Invalid orderedStepIds' });
    const newSteps = [];
    orderedStepIds.forEach((stepId, index) => {
      const step = task.steps.id(stepId);
      if (step) {
        step.order = index + 1;
        newSteps.push(step);
      }
    });
    task.steps = newSteps;
    await task.save();
    res.json(task.steps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;