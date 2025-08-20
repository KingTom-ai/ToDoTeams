# 邮箱配置加密使用说明

## 快速开始

### 1. 加密现有邮箱授权码

```bash
# 进入后端目录
cd backend

# 运行加密脚本
node scripts/encrypt-config.js "你的邮箱授权码"

# 示例输出：
# 加密结果: d4e073add4e652090b3a5db21f6bef76:2409b294ce520abdcc2ca6f6644ac9d66a1b94a36ab38985e8518b723f2b2472
```

### 2. 更新.env文件

将加密结果替换到.env文件中：

```env
# 原来的明文配置
EMAIL_PASS=ueihncyhcskocija

# 更新为加密配置
EMAIL_PASS=d4e073add4e652090b3a5db21f6bef76:2409b294ce520abdcc2ca6f6644ac9d66a1b94a36ab38985e8518b723f2b2472
```

### 3. 验证配置

```bash
# 测试解密功能
node -e "require('dotenv').config(); const {getConfigValue} = require('./utils/encryption'); console.log('解密结果:', getConfigValue(process.env.EMAIL_PASS));"

# 测试邮件发送
node test_reset_password.js
```

## 交互式加密

```bash
# 运行交互式加密脚本
node scripts/encrypt-config.js

# 按提示选择：
# 1. 邮箱授权码 (EMAIL_PASS)
# 2. 其他敏感配置
# 3. 批量加密
```

## 私有化部署

详细的私有化部署指南请参考：[DEPLOYMENT_SECURITY_GUIDE.md](./DEPLOYMENT_SECURITY_GUIDE.md)

### 关键步骤：

1. **设置加密密钥**
   ```bash
   export ENCRYPTION_KEY="your_32_byte_hex_key"
   ```

2. **加密敏感配置**
   ```bash
   node scripts/encrypt-config.js "your_sensitive_data"
   ```

3. **更新环境配置**
   ```env
   ENCRYPTION_KEY=your_32_byte_hex_key
   EMAIL_PASS=encrypted_value
   ```

## 安全注意事项

- ✅ 妥善保管 `ENCRYPTION_KEY`
- ✅ 不要将密钥提交到版本控制
- ✅ 生产环境使用强随机密钥
- ✅ 定期轮换加密密钥
- ❌ 不要在日志中输出明文密码

## 故障排除

### 解密失败
- 检查 `ENCRYPTION_KEY` 环境变量
- 确认加密数据格式正确
- 验证使用相同密钥加密和解密

### 邮件发送失败
- 确认邮箱授权码正确
- 检查网络连接
- 验证SMTP设置