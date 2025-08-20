#!/usr/bin/env node

/**
 * Todo Team 自动化部署脚本
 * 支持一键部署和初始化
 * 作者: Todo Team
 * 版本: 1.1.0
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '.deploy-config.json');

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

/**
 * 彩色日志输出
 * @param {string} message - 消息内容
 * @param {string} color - 颜色
 */
function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 错误日志输出
 * @param {string} message - 错误消息
 */
function logError(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * 成功日志输出
 * @param {string} message - 成功消息
 */
function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

/**
 * 警告日志输出
 * @param {string} message - 警告消息
 */
function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * 信息日志输出
 * @param {string} message - 信息消息
 */
function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * 保存配置到文件
 * @param {Object} config - 配置对象
 */
function saveConfig(config) {
  try {
    // 只保存非敏感配置信息，用于下次默认值
    const configToSave = {
      mongodbUri: config.mongodbUri,
      port: config.port,
      frontendUrl: config.frontendUrl,
      emailUser: config.emailUser,
      // 不保存密码，但保存是否设置过邮箱的标记
      hasEmailConfig: !!config.emailUser && !!config.emailPass,
      lastUpdated: new Date().toISOString()
    };
    
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(configToSave, null, 2));
    logInfo('配置已保存，下次部署将使用保存的默认值');
  } catch (error) {
    logWarning('配置保存失败，不影响部署: ' + error.message);
  }
}

/**
 * 加载保存的配置
 * @returns {Object|null} - 保存的配置或null
 */
function loadSavedConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      logInfo('发现保存的配置，将作为默认值');
      return savedConfig;
    }
  } catch (error) {
    logWarning('加载保存的配置失败: ' + error.message);
  }
  return null;
}

/**
 * 检查Node.js版本
 */
function checkNodeVersion() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 16) {
    logError(`Node.js版本过低: ${nodeVersion}，需要16.0.0或更高版本`);
    process.exit(1);
  }
  
  logSuccess(`Node.js版本检查通过: ${nodeVersion}`);
}

/**
 * 检查必要的命令是否存在
 * @param {string} command - 命令名称
 * @returns {boolean} - 是否存在
 */
function checkCommand(command) {
  try {
    execSync(`${command} --version`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 检查系统依赖
 */
function checkSystemDependencies() {
  logInfo('检查系统依赖...');
  
  // 检查npm
  if (!checkCommand('npm')) {
    logError('npm未安装，请先安装Node.js');
    process.exit(1);
  }
  logSuccess('npm检查通过');
  
  // 检查MongoDB（可选）
  if (checkCommand('mongod')) {
    logSuccess('MongoDB已安装');
  } else {
    logWarning('MongoDB未检测到，请确保MongoDB服务正在运行或使用远程MongoDB');
  }
}

/**
 * 检查node_modules是否存在
 * @param {string} dir - 目录路径
 * @returns {boolean} - 是否存在
 */
function checkNodeModules(dir = '.') {
  const nodeModulesPath = path.join(dir, 'node_modules');
  return fs.existsSync(nodeModulesPath) && fs.statSync(nodeModulesPath).isDirectory();
}

/**
 * 安装项目依赖
 */
function installDependencies() {
  logInfo('检查项目依赖...');
  
  const frontendNodeModulesExists = checkNodeModules('.');
  const backendNodeModulesExists = checkNodeModules('backend');
  
  if (frontendNodeModulesExists && backendNodeModulesExists) {
    logSuccess('检测到依赖包已存在，跳过安装步骤（离线部署模式）');
    logInfo('前端依赖: ✅ 已存在');
    logInfo('后端依赖: ✅ 已存在');
    return;
  }
  
  logInfo('开始安装项目依赖...');
  
  try {
    // 安装前端依赖
    if (!frontendNodeModulesExists) {
      logInfo('安装前端依赖...');
      execSync('npm install --legacy-peer-deps', { stdio: 'inherit' });
      logSuccess('前端依赖安装完成');
    } else {
      logInfo('前端依赖已存在，跳过安装');
    }
    
    // 安装后端依赖
    if (!backendNodeModulesExists) {
      logInfo('安装后端依赖...');
      execSync('npm install --legacy-peer-deps', { cwd: 'backend', stdio: 'inherit' });
      logSuccess('后端依赖安装完成');
    } else {
      logInfo('后端依赖已存在，跳过安装');
    }
    
  } catch (error) {
    logError('依赖安装失败: ' + error.message);
    logError('如果是网络问题，请使用包含依赖的离线部署包');
    process.exit(1);
  }
}

/**
 * 创建环境配置文件
 * @param {Object} config - 配置对象
 */
function createEnvFiles(config) {
  logInfo('创建环境配置文件...');
  
  // 前端环境配置
  const frontendEnv = `# 前端环境配置
GENERATE_SOURCEMAP=false
NODE_OPTIONS=--openssl-legacy-provider
NODE_ENV=production

# 邮箱配置（可选）
EMAIL_USER=${config.emailUser || ''}
EMAIL_PASS=${config.emailPass || ''}
`;
  
  // 后端环境配置
  const backendEnv = `# 后端环境配置
JWT_SECRET=${config.jwtSecret}
MONGODB_URI=${config.mongodbUri}
ENC_KEY=${config.encKey}
SIG_KEY=${config.sigKey}

# 邮箱配置（可选）
EMAIL_USER=${config.emailUser || ''}
EMAIL_PASS=${config.emailPass || ''}

# 前端URL配置（现由后端托管，使用后端端口）
FRONTEND_URL=${config.frontendUrl}

# 服务器端口
PORT=${config.port || 5001}
`;
  
  try {
    fs.writeFileSync('.env', frontendEnv);
    fs.writeFileSync('backend/.env', backendEnv);
    logSuccess('环境配置文件创建完成');
  } catch (error) {
    logError('环境配置文件创建失败: ' + error.message);
    process.exit(1);
  }
}

/**
 * 生成加密密钥
 * @returns {Object} - 包含加密密钥的对象
 */
function generateKeys() {
  const crypto = require('crypto');
  return {
    encKey: crypto.randomBytes(32).toString('base64'),
    sigKey: crypto.randomBytes(64).toString('base64'),
    jwtSecret: crypto.randomBytes(32).toString('hex')
  };
}

/**
 * 构建前端项目
 */
function buildFrontend() {
  logInfo('构建前端项目...');
  
  try {
    execSync('npm run build', { stdio: 'inherit' });
    logSuccess('前端构建完成');
  } catch (error) {
    logError('前端构建失败: ' + error.message);
    process.exit(1);
  }
}

/**
 * 优化的数据库初始化函数
 * 仅在管理员用户不存在时创建
 * @param {string} mongodbUri - MongoDB连接字符串
 */
function initializeDatabase(mongodbUri) {
  logInfo('检查数据库状态...');
  
  try {
    // 先检查管理员用户是否存在
    const checkResult = execSync('node check_admin_user.js', { 
      cwd: 'backend', 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    if (checkResult.includes('未找到管理员用户')) {
      logInfo('管理员用户不存在，开始创建...');
      execSync('node create_admin_user.js', { cwd: 'backend', stdio: 'inherit' });
      logSuccess('管理员用户创建完成');
      logInfo('默认管理员账户: admin / 123456');
    } else {
      logSuccess('管理员用户已存在，跳过创建步骤');
      logInfo('如需重置管理员密码，请手动运行: cd backend && node create_admin_user.js');
    }
  } catch (error) {
    logWarning('数据库初始化检查失败，尝试创建管理员用户...');
    try {
      execSync('node create_admin_user.js', { cwd: 'backend', stdio: 'inherit' });
      logSuccess('管理员用户处理完成');
      logInfo('默认管理员账户: admin / 123456');
    } catch (createError) {
      logWarning('管理员用户创建失败，请手动运行: cd backend && node create_admin_user.js');
    }
  }
}

/**
 * 获取本机IP地址
 * @returns {string} - IP地址
 */
function getLocalIP() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

/**
 * 启动服务器
 * @param {number} port - 端口号
 */
function startServer(port = 5001) {
  logInfo('启动服务器...');
  
  const localIP = getLocalIP();
  
  logSuccess('服务器启动成功！');
  logInfo(`本地访问: http://localhost:${port}`);
  logInfo(`局域网访问: http://${localIP}:${port}`);
  logInfo(`管理后台: http://${localIP}:${port}/admin`);
  logInfo('按 Ctrl+C 停止服务器');
  
  // 启动后端服务器
  const server = spawn('node', ['index.js'], {
    cwd: 'backend',
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  
  // 处理进程退出
  process.on('SIGINT', () => {
    logInfo('正在停止服务器...');
    server.kill('SIGINT');
    process.exit(0);
  });
  
  server.on('error', (error) => {
    logError('服务器启动失败: ' + error.message);
    process.exit(1);
  });
}

/**
 * 交互式配置收集（支持配置持久化）
 * @returns {Promise<Object>} - 配置对象
 */
function collectConfig() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const config = {};
    const localIP = getLocalIP();
    const savedConfig = loadSavedConfig();
    
    log('\n=== Todo Team 部署配置 ===', 'cyan');
    
    // MongoDB配置
    const defaultMongo = savedConfig?.mongodbUri || 'mongodb://localhost:27017/todolist_team';
    rl.question(`MongoDB连接字符串 (默认: ${defaultMongo}): `, (answer) => {
      config.mongodbUri = answer.trim() || defaultMongo;
      
      // 服务器端口配置
      const defaultPort = savedConfig?.port || 5001;
      rl.question(`服务器端口 (默认: ${defaultPort}): `, (answer) => {
        config.port = parseInt(answer.trim()) || defaultPort;
        
        // 前端URL配置 - 现在默认使用后端端口，因为前端被后端托管
        const defaultFrontendUrl = savedConfig?.frontendUrl || `http://${localIP}:${config.port}`;
        logInfo('注意: 前端现已被后端托管，使用后端端口访问');
        rl.question(`CORS前端URL (默认: ${defaultFrontendUrl}): `, (answer) => {
          config.frontendUrl = answer.trim() || defaultFrontendUrl;
          
          // 邮箱配置 - 支持使用上次的配置
          const emailPrompt = savedConfig?.emailUser 
            ? `邮箱用户名 (上次: ${savedConfig.emailUser}, 直接回车保持不变): `
            : `邮箱用户名 (可选，用于发送通知): `;
          
          rl.question(emailPrompt, (answer) => {
            config.emailUser = answer.trim() || savedConfig?.emailUser || '';
            
            // 如果用户输入了邮箱或上次有邮箱配置，询问密码
            if (config.emailUser) {
              const passPrompt = savedConfig?.hasEmailConfig && !answer.trim()
                ? `邮箱密码/授权码 (直接回车使用上次配置): `
                : `邮箱密码/授权码: `;
              
              rl.question(passPrompt, (passAnswer) => {
                // 如果有上次的配置且用户直接回车，尝试从环境变量读取
                if (savedConfig?.hasEmailConfig && !passAnswer.trim() && !answer.trim()) {
                  // 尝试从现有的 .env 文件读取
                  try {
                    const backendEnvPath = path.join(__dirname, 'backend', '.env');
                    if (fs.existsSync(backendEnvPath)) {
                      const envContent = fs.readFileSync(backendEnvPath, 'utf8');
                      const emailPassMatch = envContent.match(/EMAIL_PASS=(.+)/);
                      if (emailPassMatch) {
                        config.emailPass = emailPassMatch[1];
                        logInfo('使用已保存的邮箱配置');
                      }
                    }
                  } catch (e) {
                    logWarning('无法读取已保存的邮箱配置，请重新输入');
                  }
                }
                
                if (!config.emailPass) {
                  config.emailPass = passAnswer.trim();
                }
                
                // 生成加密密钥
                const keys = generateKeys();
                config.jwtSecret = keys.jwtSecret;
                config.encKey = keys.encKey;
                config.sigKey = keys.sigKey;
                
                // 保存配置
                saveConfig(config);
                
                rl.close();
                resolve(config);
              });
            } else {
              config.emailPass = '';
              
              // 生成加密密钥
              const keys = generateKeys();
              config.jwtSecret = keys.jwtSecret;
              config.encKey = keys.encKey;
              config.sigKey = keys.sigKey;
              
              // 保存配置
              saveConfig(config);
              
              rl.close();
              resolve(config);
            }
          });
        });
      });
    });
  });
}

/**
 * 主部署函数
 */
async function deploy() {
  try {
    log('\n🚀 Todo Team 自动化部署开始...', 'cyan');
    
    // 1. 检查系统环境
    checkNodeVersion();
    checkSystemDependencies();
    
    // 2. 收集配置
    const config = await collectConfig();
    
    // 3. 安装依赖
    installDependencies();
    
    // 4. 创建环境配置
    createEnvFiles(config);
    
    // 5. 构建前端
    buildFrontend();
    
    // 6. 优化的数据库初始化
    initializeDatabase(config.mongodbUri);
    
    log('\n🎉 部署完成！', 'green');
    logInfo('现在可以启动服务器了...');
    
    // 询问是否立即启动
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('是否立即启动服务器？(y/n): ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        startServer(config.port);
      } else {
        logInfo('稍后可以运行以下命令启动服务器:');
        logInfo('npm run server');
        logInfo('或者:');
        logInfo('npm run start:prod');
      }
    });
    
  } catch (error) {
    logError('部署失败: ' + error.message);
    process.exit(1);
  }
}

// 处理命令行参数
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  log('\nTodo Team 自动化部署脚本', 'cyan');
  log('\n用法:');
  log('  node deploy.js          # 交互式部署');
  log('  node deploy.js --help   # 显示帮助信息');
  log('\n功能:');
  log('  - 自动检查系统依赖');
  log('  - 安装项目依赖');
  log('  - 配置环境变量（支持配置持久化）');
  log('  - 构建前端项目');
  log('  - 优化的数据库初始化');
  log('  - 启动服务器');
  log('\n配置持久化:');
  log('  - 配置信息将保存到 .deploy-config.json');
  log('  - 下次部署时将自动使用之前的配置作为默认值');
  log('  - 邮箱配置支持增量更新');
  process.exit(0);
}

// 启动部署
if (require.main === module) {
  deploy();
}

module.exports = { deploy, checkNodeVersion, installDependencies, buildFrontend };