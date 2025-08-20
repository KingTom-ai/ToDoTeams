const axios = require('axios');
require('dotenv').config();

/**
 * 测试重置密码功能
 * 直接调用后端API测试邮件发送
 */
async function testResetPassword() {
  try {
    console.log('开始测试重置密码功能...');
    console.log('后端服务地址: http://localhost:5001');
    
    // 测试用的邮箱地址（从数据库中选择一个真实的QQ邮箱）
    const testEmail = '2453771647@qq.com'; // member111用户的邮箱
    
    console.log(`\n测试邮箱: ${testEmail}`);
    console.log('发送重置密码请求...');
    
    const response = await axios.post('http://localhost:5001/api/auth/forgot-password', {
      email: testEmail
    });
    
    console.log('\n✅ 请求成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
  } catch (error) {
    console.log('\n❌ 请求失败!');
    
    if (error.response) {
      console.log('错误状态:', error.response.status);
      console.log('错误数据:', error.response.data);
    } else if (error.request) {
      console.log('网络错误 - 无法连接到服务器');
      console.log('请确认后端服务是否在 http://localhost:5001 运行');
    } else {
      console.log('请求配置错误:', error.message);
    }
  }
}

// 运行测试
testResetPassword();