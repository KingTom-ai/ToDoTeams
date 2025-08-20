# 📋 Todo Team - 团队任务管理系统

> 一个功能完整的团队任务管理系统，支持实时协作、文件上传、消息通知等功能。

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

#因部分依赖文件过大，导致无法上传，需重新按照依赖，需在根目录及 backend 中运行 npm install 命令

## 🌟 功能特性

- ✅ **任务管理**：创建、分配、跟踪任务进度
- 👥 **团队协作**：多人实时协作，权限管理
- 💬 **即时通讯**：内置消息系统，实时通知
- 📁 **文件管理**：支持文件上传和共享
- 📊 **数据统计**：任务完成度统计和报表
- 🔐 **安全认证**：JWT 认证，数据加密存储
- 📱 **响应式设计**：支持桌面和移动设备
- 🌐 **局域网部署**：支持内网环境部署

## 🚀 快速开始

### 方式一：一键自动部署（推荐新手）

```bash
# 1. 下载项目到本地
# 2. 运行自动化部署脚本
node deploy.js

# 3. 按照提示输入配置信息
# 4. 等待部署完成，访问 http://localhost:5001
```

### 方式二：Docker 部署（推荐生产环境）

```bash
# 1. 确保已安装 Docker 和 Docker Compose
# 2. 复制环境配置文件
cp .env.docker .env

# 3. 启动服务（包含数据库）
docker-compose up -d

# 4. 访问 http://localhost:8080
```

### 方式三：项目打包分发

```bash
# 1. 运行打包脚本
node package-deployment.js

# 2. 将生成的压缩包发送给其他用户
# 3. 解压后按照部署说明操作
```

本指南将详细介绍各种部署方式，帮助你在任何环境中成功部署 Todo Team 系统。

## 📋 目录

- [功能特性](#🌟-功能特性)
- [快速开始](#🚀-快速开始)
- [系统要求](#💻-系统要求)
- [详细部署指南](#📖-详细部署指南)
- [环境配置](#⚙️-环境配置)
- [常见问题](#❓-常见问题)
- [性能优化](#⚡-性能优化)
- [安全配置](#🔒-安全配置)
- [技术支持](#📞-技术支持)

## 💻 系统要求

### 最低配置
- **操作系统**：Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **CPU**：双核 2.0GHz
- **内存**：4GB RAM
- **磁盘空间**：10GB 可用空间
- **网络**：100Mbps（局域网部署）

### 推荐配置
- **操作系统**：Windows 11, macOS 12+, Ubuntu 20.04+
- **CPU**：四核 2.5GHz
- **内存**：8GB RAM
- **磁盘空间**：20GB 可用空间（SSD 推荐）
- **网络**：1Gbps（高并发环境）

### 软件依赖

#### 必需软件
- **Node.js 18+**（建议使用 LTS 版本）
- **npm 8+** 或 **pnpm 7+**
- **MongoDB 6+**（本地或远程实例）

#### 可选软件
- **Docker & Docker Compose**（容器化部署）
- **Redis 6+**（缓存和会话存储）
- **Nginx**（反向代理和负载均衡）
- **Git**（版本控制）

## 🏗️ 系统架构

```
┌─────────────────────────────────────────┐    ┌─────────────────┐
│          后端服务器 (Express)            │────│ 数据库 (MongoDB) │
│  ┌─────────────────┐ ┌─────────────────┐ │    │   端口: 27017   │
│  │ 前端静态文件托管 │ │   API 服务      │ │    └─────────────────┘
│  │   (React Build) │ │  (RESTful API)  │ │
│  └─────────────────┘ └─────────────────┘ │
│           端口: 5001                    │
└─────────────────────────────────────────┘
```

### 核心组件
- **前端**：React 18 + Ant Design + Socket.io Client（由后端托管）
- **后端**：Node.js + Express + Socket.io + JWT + 静态文件服务
- **数据库**：MongoDB（用户、任务、团队数据）
- **实时通信**：WebSocket（任务更新、消息推送）
- **文件存储**：本地文件系统（支持扩展到云存储）
- **部署架构**：前后端统一部署，单端口访问

## 📖 详细部署指南

### 🎯 方式一：自动化部署（推荐新手）

这是最简单的部署方式，脚本会自动处理所有配置和安装过程。

#### 步骤 1：环境准备

**Windows 用户：**
```powershell
# 1. 安装 Node.js（访问 https://nodejs.org 下载 LTS 版本）
# 2. 验证安装
node --version  # 应显示 v18.x.x 或更高
npm --version   # 应显示 8.x.x 或更高

# 3. 安装 MongoDB（访问 https://www.mongodb.com/try/download/community）
# 或使用 Chocolatey
choco install mongodb
```

**macOS 用户：**
```bash
# 使用 Homebrew 安装
brew install node mongodb-community

# 启动 MongoDB 服务
brew services start mongodb-community
```

**Linux 用户：**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb

# CentOS/RHEL
sudo yum install -y nodejs npm mongodb-server
```

#### 步骤 2：运行自动部署

```bash
# 1. 进入项目目录
cd /path/to/todo_team

# 2. 运行自动化部署脚本
node deploy.js
```

#### 步骤 3：配置向导

脚本会引导你完成以下配置：

1. **数据库配置**
   - MongoDB 连接地址（默认：localhost:27017）
   - 数据库名称（默认：todolist_team）

2. **服务器配置**
   - 服务端口（默认：5001）
   - 绑定地址（默认：0.0.0.0，支持局域网访问）

3. **安全配置**
   - 自动生成 JWT 密钥
   - 自动生成加密密钥

4. **邮箱配置（可选）**
   - 邮箱服务商（Gmail/QQ/163）
   - 邮箱账号和授权码

5. **管理员账号**
   - 自动创建管理员账号（用户名：admin，密码：123456）

#### 步骤 4：启动服务

```bash
# 部署完成后，脚本会询问是否立即启动服务
# 选择 'y' 自动启动，或手动启动：
npm run start:prod
```

#### 步骤 5：访问系统

- **本地访问**：http://localhost:5001
- **局域网访问**：http://你的IP地址:5001
- **管理员登录**：用户名 `admin`，密码 `123456`

### 🐳 方式二：Docker 部署（推荐生产环境）

Docker 部署提供了最佳的环境隔离和部署一致性。

#### 步骤 1：安装 Docker

**Windows：**
- 下载并安装 [Docker Desktop](https://www.docker.com/products/docker-desktop)
- 启动 Docker Desktop

**macOS：**
```bash
brew install --cask docker
```

**Linux：**
```bash
# Ubuntu
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

#### 步骤 2：配置环境变量

```bash
# 复制 Docker 环境配置文件
cp .env.docker .env

# 根据需要修改配置（可选）
nano .env  # 或使用其他编辑器
```

#### 步骤 3：启动服务栈

```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 步骤 4：初始化数据

```bash
# 创建管理员账号
docker-compose exec todo-app node create_admin_user.js
```

#### 步骤 5：访问系统

- **Web 界面**：http://localhost:8080
- **API 接口**：http://localhost:8080/api
- **管理后台**：http://localhost:8080/admin

### 📦 方式三：项目打包分发

适合需要在多个环境中部署，或者离线环境部署。支持两种部署模式：**在线部署**和**离线部署**。

#### 步骤 1：生成部署包

```bash
# 运行打包脚本
node package-deployment.js

# 脚本会询问打包选项：
# - 是否跳过前端构建
# - 是否跳过依赖安装（推荐选择 No，包含依赖）
# - 是否保留临时文件
```

**打包选项说明：**
- **包含依赖包（推荐）**：选择 "No" 跳过依赖安装，会将 `node_modules` 一起打包，支持离线部署
- **不包含依赖包**：选择 "Yes" 跳过依赖安装，生成的包更小，但需要目标环境有网络连接

#### 步骤 2：分发部署包

打包完成后会生成：
- `todo-team-v[版本号]-[时间戳].zip`：完整部署包
- 包内包含 `DEPLOYMENT.md`：详细部署说明文档

#### 步骤 3：目标环境部署

##### 🌐 离线部署（推荐，无需网络）

如果打包时包含了依赖包，可以在无网络环境下直接部署：

```bash
# 1. 解压部署包
unzip todo-team-v*.zip
cd todo-team-*

# 2. 运行自动化部署脚本（会自动检测依赖包）
node deploy.js

# 脚本会显示：
# ✅ 检测到依赖包已存在，跳过安装步骤（离线部署模式）
# ℹ️  前端依赖: ✅ 已存在
# ℹ️  后端依赖: ✅ 已存在

# 3. 按照提示完成配置，系统会自动启动
```

##### 🌍 在线部署（需要网络连接）

如果打包时未包含依赖包，需要在有网络的环境下部署：

```bash
# 1. 解压部署包
unzip todo-team-v*.zip
cd todo-team-*

# 2. 运行自动化部署脚本
node deploy.js

# 脚本会自动下载和安装依赖包：
# 📦 开始安装项目依赖...
# 📦 安装前端依赖...
# 📦 安装后端依赖...

# 3. 按照提示完成配置，系统会自动启动
```

##### 🔧 手动部署（高级用户）

```bash
# 1. 解压部署包
unzip todo-team-v*.zip
cd todo-team-*

# 2. 安装依赖（仅在未包含 node_modules 时需要）
# 如果存在 node_modules 目录，可跳过此步骤
if [ ! -d "node_modules" ]; then
  npm install
  cd backend && npm install && cd ..
fi

# 3. 配置环境变量
cp .env.template .env
cp backend/.env.template backend/.env
# 编辑配置文件...

# 4. 构建前端（如果需要）
npm run build

# 5. 启动服务
npm run start:prod
```

#### 🚨 网络问题解决方案

如果在目标环境遇到 `npm install` 失败（如 `ECONNRESET` 错误）：

1. **使用离线部署包**：重新打包时选择包含依赖包
2. **配置 npm 镜像**：
   ```bash
   npm config set registry https://registry.npmmirror.com
   ```
3. **使用 cnpm**：
   ```bash
   npm install -g cnpm --registry=https://registry.npmmirror.com
   cnpm install
   ```

## ⚙️ 环境配置

### 前端配置文件 (.env)

项目根目录的 `.env` 文件用于配置前端构建和运行参数：

```bash
# 复制模板文件
cp .env.template .env
```

**主要配置项：**

| 配置项 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `GENERATE_SOURCEMAP` | 是否生成源码映射文件 | `false` | 否 |
| `NODE_OPTIONS` | Node.js 启动选项 | `--openssl-legacy-provider` | 是 |
| `NODE_ENV` | 运行环境 | `production` | 是 |
| `EMAIL_USER` | 邮箱用户名（通知功能） | - | 否 |
| `EMAIL_PASS` | 邮箱密码或授权码 | - | 否 |

### 后端配置文件 (backend/.env)

后端目录的 `.env` 文件包含服务器和数据库配置：

```bash
# 复制模板文件
cp backend/.env.template backend/.env
```

**核心配置项：**

| 配置项 | 说明 | 示例值 | 必填 |
|--------|------|--------|------|
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb://localhost:27017/todolist_team` | ✅ |
| `JWT_SECRET` | JWT 签名密钥 | `your-super-secret-jwt-key` | ✅ |
| `ENC_KEY` | 数据加密密钥（32字符） | `base64-encoded-32-char-key` | ✅ |
| `SIG_KEY` | 数据签名密钥（64字符） | `base64-encoded-64-char-key` | ✅ |
| `PORT` | 服务器端口 | `5001` | 否 |
| `HOST` | 绑定地址 | `0.0.0.0` | 否 |
| `FRONTEND_URL` | 前端地址（CORS） | `http://localhost:5001` | ✅ |
| `EMAIL_USER` | 邮箱用户名 | `your-email@gmail.com` | 否 |
| `EMAIL_PASS` | 邮箱密码/授权码 | `your-app-password` | 否 |

### 邮箱配置详解

系统支持多种邮箱服务商，用于发送任务通知和系统消息：

#### Gmail 配置
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

**设置步骤：**
1. 启用两步验证
2. 生成应用专用密码
3. 使用应用密码而非账户密码

#### QQ 邮箱配置
```bash
EMAIL_USER=your-email@qq.com
EMAIL_PASS=your-authorization-code
```

**设置步骤：**
1. 登录 QQ 邮箱网页版
2. 设置 → 账户 → 开启 SMTP 服务
3. 获取授权码

#### 163 邮箱配置
```bash
EMAIL_USER=your-email@163.com
EMAIL_PASS=your-authorization-code
```

### 安全密钥生成

**自动生成（推荐）：**
```bash
# 使用内置脚本
node backend/generate_keys.js
```

**手动生成：**
```bash
# 生成 JWT 密钥
openssl rand -base64 32

# 生成加密密钥
openssl rand -base64 32

# 生成签名密钥
openssl rand -base64 64
```

## 🗂️ 项目结构

```
todo_team/
├── 📁 src/                    # 前端源码
│   ├── 📁 components/          # React 组件
│   ├── 📁 pages/              # 页面组件
│   ├── 📁 utils/              # 工具函数
│   └── 📁 styles/             # 样式文件
├── 📁 backend/                # 后端源码
│   ├── 📁 routes/             # API 路由
│   ├── 📁 models/             # 数据模型
│   ├── 📁 middleware/         # 中间件
│   ├── 📁 utils/              # 工具函数
│   ├── 📁 uploads/            # 文件上传目录
│   └── 📄 index.js            # 服务器入口
├── 📁 build/                  # 前端构建产物
├── 📁 supabase/              # 数据库迁移文件
├── 📁 docker/                # Docker 配置
├── 📄 deploy.js              # 自动化部署脚本
├── 📄 package-deployment.js  # 打包脚本
├── 📄 docker-compose.yml     # Docker 编排文件
├── 📄 Dockerfile             # Docker 镜像构建文件
└── 📄 README.md              # 项目文档
```

## ❓ 常见问题

### 🔧 安装和配置问题

**Q1: Node.js 版本不兼容**
```bash
# 检查当前版本
node --version

# 如果版本低于 18，请升级
# Windows: 访问 nodejs.org 下载最新 LTS
# macOS: brew upgrade node
# Linux: 使用 nvm 管理版本
```

**Q2: MongoDB 连接失败**
```bash
# 检查 MongoDB 服务状态
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
sudo systemctl status mongod
```

**Q3: 端口被占用**
```bash
# 查找占用 5001 端口的进程
# Windows:
netstat -ano | findstr :5001
taskkill /PID <进程ID> /F

# macOS/Linux:
lsof -ti:5001 | xargs kill -9

# 或修改端口配置
# 在 backend/.env 中设置：PORT=5002
```

### 🌐 网络和访问问题

**Q4: 局域网无法访问**
```bash
# 1. 确认服务器绑定到 0.0.0.0
# 在 backend/.env 中设置：HOST=0.0.0.0

# 2. 检查防火墙设置
# Windows:
netsh advfirewall firewall add rule name="Todo Team" dir=in action=allow protocol=TCP localport=5001

# Linux:
sudo ufw allow 5001/tcp
```

**Q5: CORS 跨域错误**
```bash
# 在 backend/.env 中添加前端地址
FRONTEND_URL=http://your-frontend-domain:5001

# 或允许所有来源（仅开发环境）
FRONTEND_URL=*
```

### 📦 部署和运行问题

**Q6: 前端构建失败**
```bash
# 清理缓存并重新安装
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Q7: 后端启动失败**
```bash
# 检查环境变量配置
node -e "console.log(process.env.MONGODB_URI)"

# 检查依赖安装
cd backend
npm install

# 查看详细错误日志
DEBUG=* npm start
```

**Q8: Docker 部署问题**
```bash
# 检查 Docker 服务状态
docker --version
docker-compose --version

# 重新构建镜像
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 查看容器日志
docker-compose logs -f todo-app
```

### 🔐 权限和安全问题

**Q9: 文件权限错误**
```bash
# 修复文件权限
sudo chown -R $USER:$USER /path/to/todo_team
chmod -R 755 /path/to/todo_team

# 创建上传目录
mkdir -p backend/uploads
chmod 755 backend/uploads
```

**Q10: JWT 认证失败**
```bash
# 重新生成 JWT 密钥
node backend/generate_keys.js

# 或手动设置强密钥
# 在 backend/.env 中设置至少 32 位的随机字符串
```

## ⚡ 性能优化

### 🚀 应用层优化

**使用 PM2 管理进程：**
```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start backend/index.js --name todo-app

# 集群模式（多核 CPU）
pm2 start backend/index.js --name todo-app -i max

# 监控应用
pm2 monit
```

**启用 Gzip 压缩：**
```javascript
// 在 backend/index.js 中已启用
app.use(compression());
```

**静态资源缓存：**
```javascript
// 设置静态资源缓存
app.use(express.static('build', {
  maxAge: '1d',
  etag: true
}));
```

### 🗄️ 数据库优化

**创建索引：**
```javascript
// 在 MongoDB 中创建常用索引
db.users.createIndex({ "email": 1 });
db.tasks.createIndex({ "userId": 1, "createdAt": -1 });
db.teams.createIndex({ "members.userId": 1 });
db.messages.createIndex({ "teamId": 1, "createdAt": -1 });
```

**连接池配置：**
```bash
# 在 backend/.env 中配置
MONGO_POOL_SIZE=20
MONGO_CONNECT_TIMEOUT=30000
MONGO_SERVER_SELECTION_TIMEOUT=30000
```

### 🌐 网络优化

**使用 CDN 加速：**
```html
<!-- 在 public/index.html 中引入 CDN 资源 -->
<link rel="dns-prefetch" href="//cdn.jsdelivr.net">
<link rel="preconnect" href="//fonts.googleapis.com">
```

**启用 HTTP/2：**
```bash
# 使用 Nginx 作为反向代理
# 在 nginx.conf 中配置：
# listen 443 ssl http2;
```

## 🔒 安全配置

### 🛡️ 基础安全

**更新默认密码：**
```bash
# 登录系统后立即修改管理员密码
# 用户名：admin
# 默认密码：123456
# 建议修改为强密码
```

**配置 HTTPS：**
```bash
# 使用 Let's Encrypt 免费证书
sudo apt-get install certbot
sudo certbot --nginx -d your-domain.com

# 或使用自签名证书（仅测试）
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**防火墙配置：**
```bash
# Ubuntu/Debian
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 5001/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-port=5001/tcp
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 🔐 高级安全

**启用请求限制：**
```bash
# 在 backend/.env 中配置
ENABLE_RATE_LIMIT=true
RATE_LIMIT_MAX=100  # 每分钟最大请求数
```

**数据库安全：**
```javascript
// 创建 MongoDB 管理员用户
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password-here",
  roles: ["userAdminAnyDatabase", "dbAdminAnyDatabase"]
});

// 启用认证
// 在 /etc/mongod.conf 中添加：
// security:
//   authorization: enabled
```

**日志监控：**
```bash
# 启用详细日志
# 在 backend/.env 中配置
LOG_LEVEL=info
ENABLE_FILE_LOGGING=true
LOG_PATH=./logs

# 查看日志
tail -f backend/logs/app.log
```

## 📊 监控和维护

### 📈 系统监控

**资源监控：**
```bash
# 查看系统资源使用情况
top
htop
iostat -x 1

# 查看磁盘使用
df -h
du -sh /path/to/todo_team/*

# 查看网络连接
netstat -tulpn | grep :5001
```

**应用监控：**
```bash
# PM2 监控
pm2 list
pm2 show todo-app
pm2 logs todo-app --lines 100

# Docker 监控
docker stats
docker-compose logs -f --tail=100
```

### 🔄 备份和恢复

**数据库备份：**
```bash
# 创建备份
mongodump --db todolist_team --out ./backup/$(date +%Y%m%d)

# 恢复备份
mongorestore --db todolist_team ./backup/20240101/todolist_team
```

**文件备份：**
```bash
# 备份上传文件
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz backend/uploads/

# 备份配置文件
cp backend/.env backend/.env.backup
```

## 📞 技术支持

### 🆘 获取帮助

如果遇到问题，请按以下顺序排查：

1. **查看日志文件**
   - 应用日志：`backend/logs/app.log`
   - PM2 日志：`pm2 logs todo-app`
   - Docker 日志：`docker-compose logs todo-app`

2. **检查配置文件**
   - 前端配置：`.env`
   - 后端配置：`backend/.env`
   - Docker 配置：`.env.docker`

3. **验证网络连接**
   - 数据库连接：`telnet localhost 27017`
   - 应用端口：`telnet localhost 5001`

4. **检查系统资源**
   - 内存使用：`free -h`
   - 磁盘空间：`df -h`
   - CPU 使用：`top`

### 📋 故障排查清单

- [ ] Node.js 版本 >= 18
- [ ] MongoDB 服务正常运行
- [ ] 端口 5001 未被占用
- [ ] 防火墙允许相应端口
- [ ] 环境变量配置正确
- [ ] 依赖包安装完整
- [ ] 前端构建成功
- [ ] 数据库连接正常
- [ ] 管理员账号可登录
- [ ] 文件上传目录权限正确

### 📧 联系方式

- **项目文档**：查看 `DEPLOYMENT_CONFIG.md` 获取详细配置说明
- **问题反馈**：提交 GitHub Issue 或联系技术支持
- **社区支持**：加入用户交流群获取帮助

---

## 🎉 部署完成

恭喜！如果你已经成功完成部署，Todo Team 系统现在应该可以正常运行了。

**验证部署成功的标志：**
- ✅ 浏览器能正常访问系统首页
- ✅ 管理员账号可以成功登录
- ✅ 可以创建和管理任务
- ✅ 团队功能正常工作
- ✅ 文件上传功能可用
- ✅ 实时消息推送正常

**下一步操作：**
1. 修改默认管理员密码
2. 创建普通用户账号
3. 配置邮箱通知（可选）
4. 设置定期备份
5. 监控系统运行状态

**享受使用 Todo Team！** 🚀

---

*最后更新：2025年8月*  
*版本：v1.0.0*  
*许可证：MIT License*
