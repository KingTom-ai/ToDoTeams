const jwt = require('jsonwebtoken');

/**
 * JWT认证中间件
 * 支持两种token格式：
 * 1. x-auth-token 请求头
 * 2. Authorization: Bearer <token> 请求头
 */
module.exports = (req, res, next) => {
  // 首先尝试从 x-auth-token 请求头获取token
  let token = req.header('x-auth-token');
  
  // 如果没有找到，尝试从 Authorization 请求头获取Bearer token
  if (!token) {
    const authHeader = req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // 移除 'Bearer ' 前缀
    }
  }
  
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};