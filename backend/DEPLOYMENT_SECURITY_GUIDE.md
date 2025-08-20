# 私有化部署安全配置指南

## 概述

本指南详细说明如何在其他服务器上安全地部署TodoTeam项目，特别是如何处理敏感配置信息（如邮箱授权码）的加密存储和使用。

## 安全特性

### 1. 配置加密系统
- **加密算法**: AES-256-CBC
- **密钥管理**: 环境变量 `ENCRYPTION_KEY`
- **自动检测**: 系统自动识别加密和明文配置
- **向下兼容**: 支持现有明文配置的平滑迁移

### 2. 支持的敏感配置
- 邮箱授权码 (`EMAIL_PASS`)
- 数据库密码
- API密钥
- 其他敏感信息

## 部署步骤

### 第一步：环境准备

1. **克隆项目到目标服务器**
   ```bash
   git clone <your-repository-url>
   cd todo_team
   ```

2. **安装依赖**
   ```bash
   # 前端依赖
   npm install
   
   # 后端依赖
   cd backend
   npm install
   ```

### 第二步：配置加密密钥

1. **生成加密密钥**
   ```bash
   # 方法1：使用Node.js生成随机密钥
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # 方法2：使用OpenSSL生成
   openssl rand -hex 32
   ```

2. **设置环境变量**
   ```bash
   # Linux/macOS
   export ENCRYPTION_KEY="your_generated_32_byte_hex_key"
   
   # Windows
   set ENCRYPTION_KEY=your_generated_32_byte_hex_key
   
   # 或者添加到系统环境变量中
   ```

3. **永久设置环境变量**
   ```bash
   # Linux/macOS - 添加到 ~/.bashrc 或 ~/.zshrc
   echo 'export ENCRYPTION_KEY="your_generated_32_byte_hex_key"' >> ~/.bashrc
   source ~/.bashrc
   
   # 或使用 .env 文件（不推荐用于生产环境）
   echo 'ENCRYPTION_KEY=your_generated_32_byte_hex_key' >> backend/.env
   ```

### 第三步：加密敏感配置

1. **使用加密脚本**
   ```bash
   cd backend
   
   # 交互式加密
   node scripts/encrypt-config.js
   
   # 直接加密单个值
   node scripts/encrypt-config.js "your_email_password"
   ```

2. **加密邮箱配置示例**
   ```bash
   # 运行加密脚本
   node scripts/encrypt-config.js
   
   # 选择 "1. 邮箱授权码 (EMAIL_PASS)"
   # 输入邮箱地址: your_email@qq.com
   # 输入邮箱授权码: your_auth_code
   
   # 获得加密结果，例如：
   # d4e073add4e652090b3a5db21f6bef76:2409b294ce520abdcc2ca6f6644ac9d66a1b94a36ab38985e8518b723f2b2472
   ```

### 第四步：配置环境文件

1. **创建 backend/.env 文件**
   ```env
   # 基础配置
   JWT_SECRET=your_secure_jwt_secret_here
   MONGODB_URI=mongodb://localhost:27017/todolist_team
   
   # 加密密钥（重要：不要提交到版本控制）
   ENCRYPTION_KEY=your_generated_32_byte_hex_key
   
   # 现有的加密密钥（如果已存在）
   ENC_KEY=HkKeR7wB+VPlsTHurJ0OHERdZUqg1phDWQ9MFhQ9tB0=
   SIG_KEY=MBtC+L/do69TOcPG08+naw2mxUqF/DTH1bhiAeBjzrAUy2a/fg3BHe/qBW/e9zhe9Yf+pDbXIOHyRZcff6YTHw==
   
   # 邮箱配置（使用加密后的值）
   EMAIL_USER=your_email@qq.com
   EMAIL_PASS=encrypted_value_from_step3
   ```

### 第五步：验证配置

1. **测试解密功能**
   ```bash
   cd backend
   node -e "const {getConfigValue} = require('./utils/encryption'); console.log('解密测试:', getConfigValue(process.env.EMAIL_PASS));"
   ```

2. **测试邮件发送**
   ```bash
   node test_reset_password.js
   ```

## 安全最佳实践

### 1. 密钥管理
- ✅ **使用强随机密钥**: 至少32字节的随机密钥
- ✅ **环境变量存储**: 将 `ENCRYPTION_KEY` 存储在环境变量中
- ❌ **避免硬编码**: 不要将密钥写入代码或配置文件
- ❌ **版本控制排除**: 确保密钥不被提交到Git

### 2. 部署环境
- ✅ **生产环境隔离**: 生产和开发使用不同的密钥
- ✅ **访问控制**: 限制对环境变量的访问权限
- ✅ **定期轮换**: 定期更换加密密钥
- ✅ **备份策略**: 安全备份密钥和加密配置

### 3. 监控和日志
- ✅ **错误监控**: 监控解密失败的情况
- ✅ **访问日志**: 记录敏感配置的访问
- ❌ **日志泄露**: 确保日志中不包含明文密码

## 故障排除

### 常见问题

1. **解密失败**
   ```
   错误: 解密操作失败
   ```
   **解决方案**:
   - 检查 `ENCRYPTION_KEY` 环境变量是否正确设置
   - 确认加密数据格式正确（iv:encryptedData）
   - 验证使用相同的密钥进行加密和解密

2. **邮件发送失败**
   ```
   错误: SMTP authentication failed
   ```
   **解决方案**:
   - 确认邮箱授权码正确
   - 检查加密/解密是否正常工作
   - 验证邮箱SMTP设置

3. **环境变量未找到**
   ```
   警告: 未设置 ENCRYPTION_KEY 环境变量
   ```
   **解决方案**:
   - 设置 `ENCRYPTION_KEY` 环境变量
   - 重启应用程序以加载新的环境变量

### 调试命令

```bash
# 检查环境变量
echo $ENCRYPTION_KEY

# 测试加密功能
node -e "const {encrypt, decrypt} = require('./backend/utils/encryption'); const test = 'test123'; const enc = encrypt(test); console.log('加密:', enc); console.log('解密:', decrypt(enc));"

# 检查配置解析
node -e "const {getConfigValue} = require('./backend/utils/encryption'); console.log('EMAIL_PASS解密结果:', getConfigValue(process.env.EMAIL_PASS));"
```

## 迁移现有部署

### 从明文配置迁移

1. **备份现有配置**
   ```bash
   cp backend/.env backend/.env.backup
   ```

2. **生成加密密钥**
   ```bash
   export ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```

3. **加密现有敏感配置**
   ```bash
   # 加密邮箱授权码
   ENCRYPTED_PASS=$(node backend/scripts/encrypt-config.js "$(grep EMAIL_PASS backend/.env | cut -d'=' -f2)")
   
   # 更新配置文件
   sed -i "s/EMAIL_PASS=.*/EMAIL_PASS=$ENCRYPTED_PASS/" backend/.env
   ```

4. **验证迁移**
   ```bash
   node backend/test_reset_password.js
   ```

## 多环境部署

### 开发环境
```bash
# .env.development
ENCRYPTION_KEY=dev_key_32_bytes_hex
EMAIL_PASS=encrypted_dev_password
```

### 测试环境
```bash
# .env.testing
ENCRYPTION_KEY=test_key_32_bytes_hex
EMAIL_PASS=encrypted_test_password
```

### 生产环境
```bash
# 使用系统环境变量，不使用文件
export ENCRYPTION_KEY="prod_key_32_bytes_hex"
export EMAIL_PASS="encrypted_prod_password"
```

## 支持和维护

### 联系信息
- 技术支持: [技术支持邮箱]
- 文档更新: [文档仓库链接]
- 问题反馈: [Issue跟踪链接]

### 更新日志
- v1.0.0: 初始版本，支持邮箱配置加密
- 后续版本将支持更多配置类型的加密

---

**重要提醒**: 请妥善保管加密密钥，丢失后将无法解密现有配置。建议在安全的地方备份密钥。