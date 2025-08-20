const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

/**
 * 创建管理员用户脚本
 */
async function createAdminUser() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/todo_team', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB连接成功');

    // 检查是否已存在管理员用户
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('管理员用户已存在:', existingAdmin.username);
      console.log('角色:', existingAdmin.role);
      
      // 确保角色是admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('已更新管理员角色为admin');
      }
    } else {
      // 创建管理员用户
      const adminUser = new User({
        username: 'admin',
        email: 'admin@example.com',
        password: '123456', // 会被User模型自动哈希
        role: 'admin',
        phone: '13800138000'
      });
      
      await adminUser.save();
      console.log('管理员用户创建成功:', adminUser.username);
      console.log('邮箱:', adminUser.email);
      console.log('角色:', adminUser.role);
    }
    
    // 验证密码哈希
    const admin = await User.findOne({ username: 'admin' });
    const passwordMatch = await admin.comparePassword('123456');
    console.log('密码验证结果:', passwordMatch);
    
  } catch (error) {
    console.error('创建管理员用户失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
createAdminUser();