# 📋 Todo Team - Team Task Management System

> A comprehensive team task management system with real-time collaboration, file upload, and message notification features.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6+-green.svg)](https://www.mongodb.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 Features

- ✅ **Task Management**: Create, assign, and track task progress
- 👥 **Team Collaboration**: Multi-user real-time collaboration with permission management
- 💬 **Instant Messaging**: Built-in messaging system with real-time notifications
- 📁 **File Management**: Support for file upload and sharing
- 📊 **Data Analytics**: Task completion statistics and reports
- 🔐 **Security Authentication**: JWT authentication with encrypted data storage
- 📱 **Responsive Design**: Support for desktop and mobile devices
- 🌐 **LAN Deployment**: Support for intranet environment deployment

## 🚀 Quick Start

### Method 1: One-Click Auto Deployment (Recommended for Beginners)

```bash
# 1. Download the project locally
# 2. Run the automated deployment script
node deploy.js

# 3. Follow the prompts to enter configuration information
# 4. Wait for deployment to complete, then visit http://localhost:5001
```

### Method 2: Docker Deployment (Recommended for Production)

```bash
# 1. Ensure Docker and Docker Compose are installed
# 2. Copy environment configuration file
cp .env.docker .env

# 3. Start services (including database)
docker-compose up -d

# 4. Visit http://localhost:8080
```

### Method 3: Project Package Distribution

```bash
# 1. Run the packaging script
node package-deployment.js

# 2. Send the generated zip file to other users
# 3. Extract and follow deployment instructions
```

This guide will detail various deployment methods to help you successfully deploy the Todo Team system in any environment.

## 📋 Table of Contents

- [Features](#🌟-features)
- [Quick Start](#🚀-quick-start)
- [System Requirements](#💻-system-requirements)
- [Detailed Deployment Guide](#📖-detailed-deployment-guide)
- [Environment Configuration](#⚙️-environment-configuration)
- [Common Issues](#❓-common-issues)
- [Performance Optimization](#⚡-performance-optimization)
- [Security Configuration](#🔒-security-configuration)
- [Technical Support](#📞-technical-support)

## 💻 System Requirements

### Minimum Configuration
- **Operating System**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **CPU**: Dual-core 2.0GHz
- **Memory**: 4GB RAM
- **Disk Space**: 10GB available space
- **Network**: 100Mbps (LAN deployment)

### Recommended Configuration
- **Operating System**: Windows 11, macOS 12+, Ubuntu 20.04+
- **CPU**: Quad-core 2.5GHz
- **Memory**: 8GB RAM
- **Disk Space**: 20GB available space (SSD recommended)
- **Network**: 1Gbps (high concurrency environment)

### Software Dependencies

#### Required Software
- **Node.js 18+** (LTS version recommended)
- **npm 8+** or **pnpm 7+**
- **MongoDB 6+** (local or remote instance)

#### Optional Software
- **Docker & Docker Compose** (containerized deployment)
- **Redis 6+** (caching and session storage)
- **Nginx** (reverse proxy and load balancing)
- **Git** (version control)

## 🏗️ System Architecture

```
┌─────────────────────────────────────────┐    ┌─────────────────┐
│          Backend Server (Express)       │────│ Database (MongoDB) │
│  ┌─────────────────┐ ┌─────────────────┐ │    │   Port: 27017   │
│  │ Frontend Static │ │   API Service   │ │    └─────────────────┘
│  │ File Hosting    │ │  (RESTful API)  │ │
│  │ (React Build)   │ │                 │ │
│  └─────────────────┘ └─────────────────┘ │
│           Port: 5001                    │
└─────────────────────────────────────────┘
```

### Core Components
- **Frontend**: React 18 + Ant Design + Socket.io Client (hosted by backend)
- **Backend**: Node.js + Express + Socket.io + JWT + Static File Service
- **Database**: MongoDB (user, task, team data)
- **Real-time Communication**: WebSocket (task updates, message push)
- **File Storage**: Local file system (extensible to cloud storage)
- **Deployment Architecture**: Unified frontend and backend deployment, single port access

## 📖 Detailed Deployment Guide

### 🎯 Method 1: Automated Deployment (Recommended for Beginners)

This is the simplest deployment method, with scripts automatically handling all configuration and installation processes.

#### Step 1: Environment Preparation

**Windows Users:**
```powershell
# 1. Install Node.js (visit https://nodejs.org to download LTS version)
# 2. Verify installation
node --version  # Should display v18.x.x or higher
npm --version   # Should display 8.x.x or higher

# 3. Install MongoDB (visit https://www.mongodb.com/try/download/community)
# Or use Chocolatey
choco install mongodb
```

**macOS Users:**
```bash
# Install using Homebrew
brew install node mongodb-community

# Start MongoDB service
brew services start mongodb-community
```

**Linux Users:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs mongodb

# CentOS/RHEL
sudo yum install -y nodejs npm mongodb-server
```

#### Step 2: Run Auto Deployment

```bash
# 1. Enter project directory
cd /path/to/todo_team

# 2. Run automated deployment script
node deploy.js
```

#### Step 3: Configuration Wizard

The script will guide you through the following configurations:

1. **Database Configuration**
   - MongoDB connection address (default: localhost:27017)
   - Database name (default: todolist_team)

2. **Server Configuration**
   - Service port (default: 5001)
   - Bind address (default: 0.0.0.0, supports LAN access)

3. **Security Configuration**
   - Auto-generate JWT key
   - Auto-generate encryption key

4. **Email Configuration (Optional)**
   - Email service provider (Gmail/QQ/163)
   - Email account and authorization code

5. **Administrator Account**
   - Auto-create administrator account (username: admin, password: 123456)

#### Step 4: Start Service

```bash
# After deployment, the script will ask if you want to start the service immediately
# Choose 'y' to auto-start, or start manually:
npm run start:prod
```

#### Step 5: Access System

- **Local Access**: http://localhost:5001
- **LAN Access**: http://your-ip-address:5001
- **Administrator Login**: Username `admin`, Password `123456`

### 🐳 Method 2: Docker Deployment (Recommended for Production)

Docker deployment provides the best environment isolation and deployment consistency.

#### Step 1: Install Docker

**Windows:**
- Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Start Docker Desktop

**macOS:**
```bash
brew install --cask docker
```

**Linux:**
```bash
# Ubuntu
sudo apt-get update
sudo apt-get install docker.io docker-compose
sudo systemctl start docker
sudo systemctl enable docker
```

#### Step 2: Configure Environment Variables

```bash
# Copy Docker environment configuration file
cp .env.docker .env

# Modify configuration as needed (optional)
nano .env  # or use other editor
```

#### Step 3: Start Service Stack

```bash
# Start all services (background)
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Step 4: Initialize Data

```bash
# Create administrator account
docker-compose exec todo-app node create_admin_user.js
```

#### Step 5: Access System

- **Web Interface**: http://localhost:8080
- **API Interface**: http://localhost:8080/api
- **Admin Panel**: http://localhost:8080/admin

## ⚙️ Environment Configuration

### Frontend Configuration File (.env)

The `.env` file in the project root directory is used to configure frontend build and runtime parameters:

```bash
# Copy template file
cp .env.template .env
```

**Main Configuration Items:**

| Configuration | Description | Default Value | Required |
|---------------|-------------|---------------|----------|
| `GENERATE_SOURCEMAP` | Whether to generate source map files | `false` | No |
| `NODE_OPTIONS` | Node.js startup options | `--openssl-legacy-provider` | Yes |
| `NODE_ENV` | Runtime environment | `production` | Yes |
| `EMAIL_USER` | Email username (notification feature) | - | No |
| `EMAIL_PASS` | Email password or authorization code | - | No |

### Backend Configuration File (backend/.env)

The `.env` file in the backend directory contains server and database configurations:

```bash
# Copy template file
cp backend/.env.template backend/.env
```

**Core Configuration Items:**

| Configuration | Description | Example Value | Required |
|---------------|-------------|---------------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/todolist_team` | ✅ |
| `JWT_SECRET` | JWT signing key | `your-super-secret-jwt-key` | ✅ |
| `ENC_KEY` | Data encryption key (32 chars) | `base64-encoded-32-char-key` | ✅ |
| `SIG_KEY` | Data signature key (64 chars) | `base64-encoded-64-char-key` | ✅ |
| `PORT` | Server port | `5001` | No |
| `HOST` | Bind address | `0.0.0.0` | No |
| `FRONTEND_URL` | Frontend address (CORS) | `http://localhost:5001` | ✅ |
| `EMAIL_USER` | Email username | `your-email@gmail.com` | No |
| `EMAIL_PASS` | Email password/authorization code | `your-app-password` | No |

### Email Configuration Details

The system supports multiple email service providers for sending task notifications and system messages:

#### Gmail Configuration
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

**Setup Steps:**
1. Enable two-factor authentication
2. Generate app-specific password
3. Use app password instead of account password

#### QQ Email Configuration
```bash
EMAIL_USER=your-email@qq.com
EMAIL_PASS=your-authorization-code
```

**Setup Steps:**
1. Login to QQ Email web version
2. Settings → Account → Enable SMTP service
3. Get authorization code

#### 163 Email Configuration
```bash
EMAIL_USER=your-email@163.com
EMAIL_PASS=your-authorization-code
```

### Security Key Generation

**Auto Generation (Recommended):**
```bash
# Use built-in script
node backend/generate_keys.js
```

**Manual Generation:**
```bash
# Generate JWT key
openssl rand -base64 32

# Generate encryption key
openssl rand -base64 32

# Generate signature key
openssl rand -base64 64
```

## ❓ Common Issues

### 🔧 Installation and Configuration Issues

**Q1: Node.js version incompatibility**
```bash
# Check current version
node --version

# If version is below 18, please upgrade
# Windows: Visit nodejs.org to download latest LTS
# macOS: brew upgrade node
# Linux: Use nvm to manage versions
```

**Q2: MongoDB connection failure**
```bash
# Check MongoDB service status
# Windows:
net start MongoDB

# macOS:
brew services start mongodb-community

# Linux:
sudo systemctl start mongod
sudo systemctl status mongod
```

**Q3: Port occupied**
```bash
# Find process occupying port 5001
# Windows:
netstat -ano | findstr :5001
taskkill /PID <ProcessID> /F

# macOS/Linux:
lsof -ti:5001 | xargs kill -9

# Or modify port configuration
# Set in backend/.env: PORT=5002
```

### 🌐 Network and Access Issues

**Q4: LAN access unavailable**
```bash
# 1. Confirm server binds to 0.0.0.0
# Set in backend/.env: HOST=0.0.0.0

# 2. Check firewall settings
# Windows:
netsh advfirewall firewall add rule name="Todo Team" dir=in action=allow protocol=TCP localport=5001

# Linux:
sudo ufw allow 5001/tcp
```

**Q5: CORS cross-origin error**
```bash
# Add frontend address in backend/.env
FRONTEND_URL=http://your-frontend-domain:5001

# Or allow all origins (development only)
FRONTEND_URL=*
```

## 🔒 Security Configuration

### 🛡️ Basic Security

**Update default password:**
```bash
# Change administrator password immediately after login
# Username: admin
# Default password: 123456
# Recommend changing to a strong password
```

**Configure HTTPS:**
```bash
# Use Let's Encrypt free certificate
sudo apt-get install certbot
sudo certbot --nginx -d your-domain.com

# Or use self-signed certificate (testing only)
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

**Firewall configuration:**
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

## 📞 Technical Support

### 🆘 Getting Help

If you encounter problems, please troubleshoot in the following order:

1. **Check log files**
   - Application logs: `backend/logs/app.log`
   - PM2 logs: `pm2 logs todo-app`
   - Docker logs: `docker-compose logs todo-app`

2. **Check configuration files**
   - Frontend config: `.env`
   - Backend config: `backend/.env`
   - Docker config: `.env.docker`

3. **Verify network connections**
   - Database connection: `telnet localhost 27017`
   - Application port: `telnet localhost 5001`

4. **Check system resources**
   - Memory usage: `free -h`
   - Disk space: `df -h`
   - CPU usage: `top`

### 📋 Troubleshooting Checklist

- [ ] Node.js version >= 18
- [ ] MongoDB service running normally
- [ ] Port 5001 not occupied
- [ ] Firewall allows corresponding ports
- [ ] Environment variables configured correctly
- [ ] Dependencies installed completely
- [ ] Frontend build successful
- [ ] Database connection normal
- [ ] Administrator account can login
- [ ] File upload directory permissions correct

---

**License**: MIT License
**Version**: 1.0.0
**Last Updated**: 2024#   t o d o t e a m 
 
 
# ToDoTeams
