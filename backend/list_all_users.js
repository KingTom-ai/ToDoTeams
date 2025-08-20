const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

/**
 * 列出所有用户
 */
async function listAllUsers() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('MongoDB connected');
    
    // 查找所有用户
    const users = await User.find({}).select('-password');
    
    console.log(`\n找到 ${users.length} 个用户:`);
    console.log('=' .repeat(80));
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   用户名: ${user.username}`);
      console.log(`   邮箱: ${user.email}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   创建时间: ${user.createdAt}`);
      console.log('-'.repeat(40));
    });
    
    // 关闭数据库连接
    await mongoose.connection.close();
    console.log('\n数据库连接已关闭');
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

listAllUsers();