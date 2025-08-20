const axios = require('axios');
const colors = require('colors');

// 配置
const BASE_URL = 'http://localhost:5001/api';
const ADMIN_CREDENTIALS = {
  identifier: 'admin',
  password: '123456'
};

let authToken = null;

/**
 * 日志输出函数
 * @param {string} message - 消息内容
 * @param {string} type - 消息类型 (success, error, info, warning)
 */
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  switch (type) {
    case 'success':
      console.log(`[${timestamp}] ✅ ${message}`.green);
      break;
    case 'error':
      console.log(`[${timestamp}] ❌ ${message}`.red);
      break;
    case 'warning':
      console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
      break;
    case 'info':
    default:
      console.log(`[${timestamp}] ℹ️  ${message}`.blue);
      break;
  }
}

/**
 * HTTP请求封装函数
 * @param {string} method - HTTP方法
 * @param {string} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} headers - 请求头
 * @returns {Promise} 请求结果
 */
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (authToken) {
      config.headers.Authorization = `Bearer ${authToken}`;
    }
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return {
      success: false,
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

/**
 * 测试管理员认证
 */
async function testAdminAuth() {
  log('开始测试管理员认证...', 'info');
  
  // 1. 测试登录
  const loginResult = await makeRequest('POST', '/auth/login', ADMIN_CREDENTIALS);
  
  if (loginResult.success && loginResult.data.token) {
    authToken = loginResult.data.token;
    log('管理员登录成功', 'success');
    log(`Token: ${authToken.substring(0, 20)}...`, 'info');
  } else {
    log(`管理员登录失败: ${JSON.stringify(loginResult.error)}`, 'error');
    return false;
  }
  
  // 2. 测试token验证
  const profileResult = await makeRequest('GET', '/users/profile');
  if (profileResult.success) {
    log(`当前用户: ${profileResult.data.username} (${profileResult.data.role})`, 'success');
    if (profileResult.data.role !== 'admin') {
      log('警告: 当前用户不是管理员角色', 'warning');
    }
  } else {
    log(`获取用户信息失败: ${JSON.stringify(profileResult.error)}`, 'error');
  }
  
  return true;
}

/**
 * 测试用户管理API
 */
async function testUserManagement() {
  log('开始测试用户管理API...', 'info');
  
  // 1. 获取用户列表
  const usersResult = await makeRequest('GET', '/admin/users?page=1&limit=5');
  if (usersResult.success) {
    log(`获取用户列表成功，共 ${usersResult.data.pagination.count} 个用户`, 'success');
    log(`当前页: ${usersResult.data.pagination.current}/${usersResult.data.pagination.total}`, 'info');
  } else {
    log(`获取用户列表失败: ${JSON.stringify(usersResult.error)}`, 'error');
  }
  
  // 2. 创建测试用户
  const newUser = {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'testpass123',
    role: 'user'
  };
  
  const createResult = await makeRequest('POST', '/admin/users', newUser);
  if (createResult.success) {
    log(`创建用户成功: ${createResult.data.username}`, 'success');
    
    // 3. 更新用户
    const updateResult = await makeRequest('PUT', `/admin/users/${createResult.data._id}`, {
      email: `updated_${Date.now()}@example.com`
    });
    
    if (updateResult.success) {
      log(`更新用户成功: ${updateResult.data.email}`, 'success');
    } else {
      log(`更新用户失败: ${JSON.stringify(updateResult.error)}`, 'error');
    }
    
    // 4. 获取用户详情
    const userDetailResult = await makeRequest('GET', `/admin/users/${createResult.data._id}`);
    if (userDetailResult.success) {
      log(`获取用户详情成功: ${userDetailResult.data.user.username}`, 'success');
    } else {
      log(`获取用户详情失败: ${JSON.stringify(userDetailResult.error)}`, 'error');
    }
    
  } else {
    log(`创建用户失败: ${JSON.stringify(createResult.error)}`, 'error');
  }
}

/**
 * 测试团队管理API
 */
async function testTeamManagement() {
  log('开始测试团队管理API...', 'info');
  
  // 1. 获取团队列表
  const teamsResult = await makeRequest('GET', '/admin/teams?page=1&limit=5');
  if (teamsResult.success) {
    log(`获取团队列表成功，共 ${teamsResult.data.pagination.count} 个团队`, 'success');
    
    // 2. 如果有团队，获取第一个团队的详情
    if (teamsResult.data.teams.length > 0) {
      const firstTeam = teamsResult.data.teams[0];
      const teamDetailResult = await makeRequest('GET', `/admin/teams/${firstTeam._id}`);
      
      if (teamDetailResult.success) {
        log(`获取团队详情成功: ${teamDetailResult.data.team.name}`, 'success');
        log(`团队成员数: ${teamDetailResult.data.team.members.length}`, 'info');
        log(`团队任务统计: ${JSON.stringify(teamDetailResult.data.taskStats)}`, 'info');
      } else {
        log(`获取团队详情失败: ${JSON.stringify(teamDetailResult.error)}`, 'error');
      }
    }
  } else {
    log(`获取团队列表失败: ${JSON.stringify(teamsResult.error)}`, 'error');
  }
}

/**
 * 测试任务管理API
 */
async function testTaskManagement() {
  log('开始测试任务管理API...', 'info');
  
  // 1. 获取任务列表
  const tasksResult = await makeRequest('GET', '/admin/tasks?page=1&limit=5');
  if (tasksResult.success) {
    log(`获取任务列表成功，共 ${tasksResult.data.pagination.count} 个任务`, 'success');
  } else {
    log(`获取任务列表失败: ${JSON.stringify(tasksResult.error)}`, 'error');
  }
  
  // 2. 获取任务统计
  const statsResult = await makeRequest('GET', '/admin/tasks/stats');
  if (statsResult.success) {
    log('获取任务统计成功', 'success');
    log(`总任务数: ${statsResult.data.summary.totalTasks}`, 'info');
    log(`已完成: ${statsResult.data.summary.completedTasks}`, 'info');
    log(`完成率: ${statsResult.data.summary.completionRate}%`, 'info');
  } else {
    log(`获取任务统计失败: ${JSON.stringify(statsResult.error)}`, 'error');
  }
}

/**
 * 测试系统监控API
 */
async function testSystemMonitoring() {
  log('开始测试系统监控API...', 'info');
  
  // 1. 获取系统性能
  const performanceResult = await makeRequest('GET', '/admin/system/performance');
  if (performanceResult.success) {
    log('获取系统性能成功', 'success');
    if (performanceResult.data.system) {
      log(`CPU数量: ${performanceResult.data.system.cpuCount}`, 'info');
      log(`系统运行时间: ${Math.floor(performanceResult.data.system.uptime / 3600)}小时`, 'info');
    }
    if (performanceResult.data.process) {
      const memUsage = performanceResult.data.process.memoryUsage;
      const memUsagePercent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2);
      log(`内存使用率: ${memUsagePercent}%`, 'info');
    }
    if (performanceResult.data.database) {
      log(`数据库统计 - 用户: ${performanceResult.data.database.users}, 团队: ${performanceResult.data.database.teams}, 任务: ${performanceResult.data.database.tasks}`, 'info');
    }
  } else {
    log(`获取系统性能失败: ${JSON.stringify(performanceResult.error)}`, 'error');
  }
  
  // 2. 获取系统健康状态
  const healthResult = await makeRequest('GET', '/admin/system/health');
  if (healthResult.success) {
    log('获取系统健康状态成功', 'success');
    log(`整体状态: ${healthResult.data.status}`, 'info');
    log(`检查项目: ${Object.keys(healthResult.data.checks || {}).length}`, 'info');
    if (healthResult.data.checks) {
      Object.entries(healthResult.data.checks).forEach(([key, value]) => {
        log(`  ${key}: ${value.status} - ${value.message || ''}`, 'info');
      });
    }
  } else {
    log(`获取系统健康状态失败: ${JSON.stringify(healthResult.error)}`, 'error');
  }
  
  // 3. 获取系统配置
  const configResult = await makeRequest('GET', '/admin/system/config');
  if (configResult.success) {
    log('获取系统配置成功', 'success');
  } else {
    log(`获取系统配置失败: ${JSON.stringify(configResult.error)}`, 'error');
  }
}

/**
 * 测试统计分析API
 */
async function testAnalytics() {
  log('开始测试统计分析API...', 'info');
  
  // 1. 获取用户活跃度统计
  const userActivityResult = await makeRequest('GET', '/admin/analytics/users?period=30d');
  if (userActivityResult.success) {
    log('获取用户活跃度统计成功', 'success');
    log(`总用户数: ${userActivityResult.data.summary.totalUsers}`, 'info');
    log(`活跃用户数: ${userActivityResult.data.summary.activeUsers}`, 'info');
  } else {
    log(`获取用户活跃度统计失败: ${JSON.stringify(userActivityResult.error)}`, 'error');
  }
  
  // 2. 获取团队绩效统计
  const teamPerformanceResult = await makeRequest('GET', '/admin/analytics/teams?period=30d');
  if (teamPerformanceResult.success) {
    log('获取团队绩效统计成功', 'success');
    log(`团队数量: ${teamPerformanceResult.data.summary.totalTeams}`, 'info');
  } else {
    log(`获取团队绩效统计失败: ${JSON.stringify(teamPerformanceResult.error)}`, 'error');
  }
  
  // 3. 获取任务趋势统计
  const taskTrendResult = await makeRequest('GET', '/admin/analytics/tasks?period=30d');
  if (taskTrendResult.success) {
    log('获取任务趋势统计成功', 'success');
  } else {
    log(`获取任务趋势统计失败: ${JSON.stringify(taskTrendResult.error)}`, 'error');
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('='.repeat(60).cyan);
  console.log('🚀 开始后端管理系统API测试'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  try {
    // 1. 测试管理员认证
    const authSuccess = await testAdminAuth();
    if (!authSuccess) {
      log('认证失败，终止测试', 'error');
      return;
    }
    
    console.log('\n' + '-'.repeat(40).gray);
    
    // 2. 测试用户管理
    await testUserManagement();
    
    console.log('\n' + '-'.repeat(40).gray);
    
    // 3. 测试团队管理
    await testTeamManagement();
    
    console.log('\n' + '-'.repeat(40).gray);
    
    // 4. 测试任务管理
    await testTaskManagement();
    
    console.log('\n' + '-'.repeat(40).gray);
    
    // 5. 测试系统监控
    await testSystemMonitoring();
    
    console.log('\n' + '-'.repeat(40).gray);
    
    // 6. 测试统计分析
    await testAnalytics();
    
    console.log('\n' + '='.repeat(60).cyan);
    log('🎉 所有测试完成！', 'success');
    console.log('='.repeat(60).cyan);
    
  } catch (error) {
    log(`测试过程中发生错误: ${error.message}`, 'error');
    console.error(error);
  }
}

// 检查是否直接运行此脚本
if (require.main === module) {
  // 检查依赖
  try {
    require('axios');
    require('colors');
  } catch (error) {
    console.error('❌ 缺少依赖包，请运行: npm install axios colors');
    process.exit(1);
  }
  
  runTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testAdminAuth,
  testUserManagement,
  testTeamManagement,
  testTaskManagement,
  testSystemMonitoring,
  testAnalytics
};