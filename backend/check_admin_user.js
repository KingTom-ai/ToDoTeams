const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

/**
 * 检查管理员用户的角色设置
 */
async function checkAdminUser() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected');
    
    // 查找管理员用户
    const adminUser = await User.findOne({ username: 'admin' });
    
    if (adminUser) {
      console.log('管理员用户信息:');
      console.log('ID:', adminUser._id);
      console.log('用户名:', adminUser.username);
      console.log('邮箱:', adminUser.email);
      console.log('角色:', adminUser.role);
      console.log('创建时间:', adminUser.createdAt);
      
      // 如果角色不是admin，更新它
      if (adminUser.role !== 'admin') {
        console.log('\n角色不正确，正在更新为admin...');
        adminUser.role = 'admin';
        await adminUser.save();
        console.log('角色已更新为admin');
      } else {
        console.log('\n角色设置正确');
      }
    } else {
      console.log('未找到管理员用户');
    }
    
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

checkAdminUser();