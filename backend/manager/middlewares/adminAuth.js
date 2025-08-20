const auth = require('../../middleware/auth');
const role = require('../../middleware/role');

/**
 * 管理员认证中间件
 * 结合用户认证和管理员角色验证
 */
const adminAuth = [auth, role(['admin'])];

/**
 * 超级管理员认证中间件
 * 用于需要最高权限的操作
 */
const superAdminAuth = [auth, role(['super_admin', 'admin'])];

/**
 * 检查管理员权限的中间件
 * @param {Array} requiredRoles - 需要的角色数组
 * @returns {Array} 中间件数组
 */
const requireAdminRole = (requiredRoles = ['admin']) => {
  return [auth, role(requiredRoles)];
};

/**
 * 记录管理员操作日志的中间件
 * @param {string} action - 操作类型
 * @returns {Function} 中间件函数
 */
const logAdminAction = (action) => {
  return (req, res, next) => {
    // 记录管理员操作
    console.log(`[ADMIN ACTION] ${new Date().toISOString()} - User: ${req.user} - Action: ${action} - IP: ${req.ip}`);
    
    // 可以在这里添加更详细的日志记录逻辑
    // 比如保存到数据库或日志文件
    
    next();
  };
};

module.exports = {
  adminAuth,
  superAdminAuth,
  requireAdminRole,
  logAdminAction
};