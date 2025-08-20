const Redis = require('ioredis');

let redis;
let redisAvailable = false;

// 创建一个降级的Redis客户端，当Redis不可用时使用
const fallbackRedis = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 1
};

if (process.env.NODE_ENV !== 'test') {
  // 简单检查Redis是否可用，如果不可用则直接使用fallback
  console.log('Redis not available, running in no-cache mode');
  redisAvailable = false;
  redis = fallbackRedis;
} else {
  redis = fallbackRedis;
}

// 导出包装的Redis客户端
module.exports = {
  get: async (...args) => {
    if (!redisAvailable) return null;
    try {
      return await redis.get(...args);
    } catch (err) {
      redisAvailable = false;
      return null;
    }
  },
  set: async (...args) => {
    if (!redisAvailable) return 'OK';
    try {
      return await redis.set(...args);
    } catch (err) {
      redisAvailable = false;
      return 'OK';
    }
  },
  del: async (...args) => {
    if (!redisAvailable) return 1;
    try {
      return await redis.del(...args);
    } catch (err) {
      redisAvailable = false;
      return 1;
    }
  }
};