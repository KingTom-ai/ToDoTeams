const crypto = require('crypto');

/**
 * 加密工具类
 * 用于处理敏感配置信息的加密和解密
 */
class EncryptionUtil {
  constructor() {
    // 从环境变量获取加密密钥，如果不存在则使用默认密钥（仅用于开发环境）
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-key-for-development-only';
    this.algorithm = 'aes-256-cbc';
  }

  /**
   * 函数级注释：加密文本
   * 使用AES-256-CBC算法对文本进行加密
   * @param {string} text - 需要加密的明文
   * @returns {string} 加密后的文本（格式：iv:encryptedData）
   */
  encrypt(text) {
    try {
      // 生成随机初始化向量
      const iv = crypto.randomBytes(16);
      
      // 创建密钥哈希
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      
      // 创建加密器
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);
      
      // 加密数据
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // 返回格式：iv:encryptedData
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('加密失败:', error.message);
      throw new Error('加密操作失败');
    }
  }

  /**
   * 函数级注释：解密文本
   * 使用AES-256-CBC算法对加密文本进行解密
   * @param {string} encryptedText - 加密的文本（格式：iv:encryptedData）
   * @returns {string} 解密后的明文
   */
  decrypt(encryptedText) {
    try {
      // 分离IV和加密数据
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('加密数据格式错误');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      
      // 创建密钥哈希
      const key = crypto.createHash('sha256').update(this.encryptionKey).digest();
      
      // 创建解密器
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      
      // 解密数据
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('解密失败:', error.message);
      throw new Error('解密操作失败');
    }
  }

  /**
   * 函数级注释：检查文本是否已加密
   * 通过检查文本格式判断是否为加密数据
   * @param {string} text - 待检查的文本
   * @returns {boolean} 是否为加密数据
   */
  isEncrypted(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }
    
    // 检查是否符合加密格式：32位hex:加密数据
    const parts = text.split(':');
    return parts.length === 2 && /^[0-9a-f]{32}$/i.test(parts[0]);
  }

  /**
   * 函数级注释：安全获取配置值
   * 自动检测配置值是否加密，如果加密则解密后返回
   * @param {string} configValue - 配置值（可能是加密的）
   * @returns {string} 解密后的配置值
   */
  getConfigValue(configValue) {
    if (!configValue) {
      return configValue;
    }
    
    // 如果是加密数据，则解密
    if (this.isEncrypted(configValue)) {
      return this.decrypt(configValue);
    }
    
    // 如果不是加密数据，直接返回
    return configValue;
  }
}

// 创建单例实例
const encryptionUtil = new EncryptionUtil();

module.exports = {
  EncryptionUtil,
  encryptionUtil,
  // 导出便捷方法
  encrypt: (text) => encryptionUtil.encrypt(text),
  decrypt: (text) => encryptionUtil.decrypt(text),
  getConfigValue: (configValue) => encryptionUtil.getConfigValue(configValue),
  isEncrypted: (text) => encryptionUtil.isEncrypted(text)
};