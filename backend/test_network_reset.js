const axios = require('axios');
require('dotenv').config();

/**
 * 测试重置密码功能的网络主机地址动态生成
 * 模拟来自不同主机的请求
 */
async function testNetworkReset() {
  console.log('开始测试网络环境下的重置密码功能...');
  
  const testEmail = '2453771647@qq.com';
  console.log('测试邮箱:', testEmail);
  
  try {
    // 模拟来自局域网IP的请求
    const response = await axios.post('http://127.0.0.1:5001/api/auth/forgot-password', {
      email: testEmail
    }, {
      headers: {
        'Host': '192.168.1.100:5001',  // 模拟局域网主机地址
        'X-Forwarded-Proto': 'http',   // 模拟协议
        'User-Agent': 'Test-Client/1.0'
      }
    });
    
    console.log('\n✅ 网络请求成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', response.data);
    
  } catch (error) {
    console.log('\n❌ 网络请求失败!');
    if (error.response) {
      console.log('错误状态:', error.response.status);
      console.log('错误数据:', error.response.data);
    } else {
      console.log('错误信息:', error.message);
    }
  }
}

// 运行测试
testNetworkReset();