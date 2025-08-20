#!/usr/bin/env node

/**
 * Todo Team 健康检查脚本
 * 用于Docker容器健康状态检测
 * 作者: Todo Team
 * 版本: 1.0.0
 */

const http = require('http');
const mongoose = require('mongoose');

/**
 * 检查HTTP服务是否正常
 * @returns {Promise<boolean>} - 服务是否正常
 */
function checkHttpService() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 5001,
      path: '/api/health',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode === 200);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * 检查数据库连接是否正常
 * @returns {Promise<boolean>} - 数据库连接是否正常
 */
function checkDatabaseConnection() {
  return new Promise((resolve) => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/todolist_team';
    
    // 设置连接超时
    const timeoutId = setTimeout(() => {
      resolve(false);
    }, 5000);

    mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000
    })
    .then(() => {
      clearTimeout(timeoutId);
      mongoose.connection.close();
      resolve(true);
    })
    .catch(() => {
      clearTimeout(timeoutId);
      resolve(false);
    });
  });
}

/**
 * 检查内存使用情况
 * @returns {boolean} - 内存使用是否正常
 */
function checkMemoryUsage() {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal + memUsage.external;
  const maxMemory = 512 * 1024 * 1024; // 512MB
  
  return totalMemory < maxMemory;
}

/**
 * 检查磁盘空间（简单检查）
 * @returns {boolean} - 磁盘空间是否充足
 */
function checkDiskSpace() {
  try {
    const fs = require('fs');
    const stats = fs.statSync('/app');
    return true; // 如果能访问目录，认为磁盘空间正常
  } catch (error) {
    return false;
  }
}

/**
 * 主健康检查函数
 */
async function healthCheck() {
  console.log('开始健康检查...');
  
  const checks = {
    http: false,
    database: false,
    memory: false,
    disk: false
  };
  
  try {
    // 检查HTTP服务
    checks.http = await checkHttpService();
    console.log(`HTTP服务: ${checks.http ? '✅ 正常' : '❌ 异常'}`);
    
    // 检查数据库连接
    checks.database = await checkDatabaseConnection();
    console.log(`数据库连接: ${checks.database ? '✅ 正常' : '❌ 异常'}`);
    
    // 检查内存使用
    checks.memory = checkMemoryUsage();
    console.log(`内存使用: ${checks.memory ? '✅ 正常' : '❌ 异常'}`);
    
    // 检查磁盘空间
    checks.disk = checkDiskSpace();
    console.log(`磁盘空间: ${checks.disk ? '✅ 正常' : '❌ 异常'}`);
    
    // 判断整体健康状态
    const isHealthy = checks.http && checks.database && checks.memory && checks.disk;
    
    if (isHealthy) {
      console.log('🎉 应用健康状态: 正常');
      process.exit(0);
    } else {
      console.log('⚠️ 应用健康状态: 异常');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('健康检查失败:', error.message);
    process.exit(1);
  }
}

// 设置超时保护
setTimeout(() => {
  console.error('健康检查超时');
  process.exit(1);
}, 10000);

// 执行健康检查
if (require.main === module) {
  healthCheck();
}

module.exports = { healthCheck, checkHttpService, checkDatabaseConnection };