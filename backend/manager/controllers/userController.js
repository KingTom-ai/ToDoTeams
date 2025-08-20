const User = require('../../models/User');
const bcrypt = require('bcryptjs');

/**
 * 获取用户列表（分页、搜索、过滤）
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    // 构建查询条件
    const query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      query.role = role;
    }
    
    // 计算分页
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
    
    // 查询用户
    const users = await User.find(query)
      .select('-password')
      .populate('teams', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));
    
    // 获取总数
    const total = await User.countDocuments(query);
    
    res.json({
      users,
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
 * 获取用户详情
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('teams', 'name members');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 获取用户的任务统计
    const Task = require('../../models/Task');
    const taskStats = await Task.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      user,
      taskStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 创建用户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const createUser = async (req, res) => {
  try {
    const { username, email, phone, password, role = 'user' } = req.body;
    
    // 验证必填字段
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // 检查手机号是否已存在
    if (phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone already exists' });
      }
    }
    
    // 创建用户
    const user = new User({
      username,
      email,
      phone,
      password,
      role
    });
    
    await user.save();
    
    // 返回用户信息（不包含密码）
    const userResponse = await User.findById(user._id).select('-password');
    res.status(201).json(userResponse);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 更新用户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const updateUser = async (req, res) => {
  try {
    const { username, email, phone, password, role, theme } = req.body;
    const userId = req.params.id;
    
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 构建更新数据
    const updateData = {};
    
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      updateData.username = username;
    }
    
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      updateData.email = email;
    }
    
    if (phone && phone !== user.phone) {
      const existingPhone = await User.findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ error: 'Phone already exists' });
      }
      updateData.phone = phone;
    }
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    if (role) {
      updateData.role = role;
    }
    
    if (theme) {
      updateData.theme = theme;
    }
    
    // 更新用户
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/**
 * 删除用户
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 防止删除管理员账户（可选）
    if (user.role === 'admin' && user._id.toString() === req.user) {
      return res.status(403).json({ error: 'Cannot delete your own admin account' });
    }
    
    // 删除用户相关数据
    const Task = require('../../models/Task');
    const Team = require('../../models/Team');
    
    // 删除用户的个人任务
    await Task.deleteMany({ userId: userId });
    
    // 从团队中移除用户
    await Team.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );
    
    // 删除用户
    await User.findByIdAndDelete(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * 重置用户密码
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
const resetPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }
    
    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 更新密码
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword
};