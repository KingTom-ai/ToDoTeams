#!/usr/bin/env node

const { encrypt } = require('../utils/encryption');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

/**
 * 函数级注释：配置加密脚本
 * 用于加密敏感配置信息，如邮箱授权码等
 * 支持交互式输入和批量加密
 */

// 创建readline接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * 函数级注释：提示用户输入
 * @param {string} question - 提示问题
 * @returns {Promise<string>} 用户输入的内容
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * 函数级注释：加密单个配置值
 * @param {string} value - 需要加密的值
 * @returns {string} 加密后的值
 */
function encryptValue(value) {
  try {
    return encrypt(value);
  } catch (error) {
    console.error('加密失败:', error.message);
    process.exit(1);
  }
}

/**
 * 函数级注释：显示使用说明
 */
function showUsage() {
  console.log('\n=== 配置加密工具 ===');
  console.log('此工具用于加密敏感配置信息，如邮箱授权码等。');
  console.log('\n使用方法:');
  console.log('1. 交互式加密: node scripts/encrypt-config.js');
  console.log('2. 直接加密: node scripts/encrypt-config.js "要加密的内容"');
  console.log('\n注意事项:');
  console.log('- 请确保已设置 ENCRYPTION_KEY 环境变量');
  console.log('- 加密后的配置需要更新到 .env 文件中');
  console.log('- 请妥善保管加密密钥，丢失后无法解密\n');
}

/**
 * 函数级注释：交互式加密流程
 */
async function interactiveEncryption() {
  console.log('\n=== 交互式配置加密 ===');
  
  try {
    // 检查加密密钥
    if (!process.env.ENCRYPTION_KEY) {
      console.log('\n⚠️  警告: 未设置 ENCRYPTION_KEY 环境变量，将使用默认密钥（仅适用于开发环境）');
      const useDefault = await askQuestion('是否继续使用默认密钥? (y/N): ');
      if (useDefault.toLowerCase() !== 'y') {
        console.log('\n请先设置 ENCRYPTION_KEY 环境变量后再运行此脚本。');
        process.exit(1);
      }
    }

    console.log('\n请选择要加密的配置类型:');
    console.log('1. 邮箱授权码 (EMAIL_PASS)');
    console.log('2. 其他敏感配置');
    console.log('3. 批量加密');
    
    const choice = await askQuestion('\n请输入选择 (1-3): ');
    
    switch (choice) {
      case '1':
        await encryptEmailConfig();
        break;
      case '2':
        await encryptCustomConfig();
        break;
      case '3':
        await batchEncryption();
        break;
      default:
        console.log('无效选择，退出程序。');
        break;
    }
  } catch (error) {
    console.error('操作失败:', error.message);
  } finally {
    rl.close();
  }
}

/**
 * 函数级注释：加密邮箱配置
 */
async function encryptEmailConfig() {
  console.log('\n=== 邮箱配置加密 ===');
  
  const emailUser = await askQuestion('请输入邮箱地址: ');
  const emailPass = await askQuestion('请输入邮箱授权码: ');
  
  if (!emailUser || !emailPass) {
    console.log('邮箱地址和授权码不能为空！');
    return;
  }
  
  const encryptedPass = encryptValue(emailPass);
  
  console.log('\n=== 加密结果 ===');
  console.log('邮箱地址 (明文):', emailUser);
  console.log('加密后的授权码:', encryptedPass);
  
  console.log('\n请将以下内容更新到 .env 文件中:');
  console.log(`EMAIL_USER=${emailUser}`);
  console.log(`EMAIL_PASS=${encryptedPass}`);
  
  const saveToFile = await askQuestion('\n是否自动更新 .env 文件? (y/N): ');
  if (saveToFile.toLowerCase() === 'y') {
    await updateEnvFile('EMAIL_USER', emailUser);
    await updateEnvFile('EMAIL_PASS', encryptedPass);
    console.log('✅ .env 文件已更新');
  }
}

/**
 * 函数级注释：加密自定义配置
 */
async function encryptCustomConfig() {
  console.log('\n=== 自定义配置加密 ===');
  
  const configName = await askQuestion('请输入配置名称: ');
  const configValue = await askQuestion('请输入配置值: ');
  
  if (!configName || !configValue) {
    console.log('配置名称和值不能为空！');
    return;
  }
  
  const encryptedValue = encryptValue(configValue);
  
  console.log('\n=== 加密结果 ===');
  console.log('配置名称:', configName);
  console.log('加密后的值:', encryptedValue);
  
  console.log('\n请将以下内容添加到 .env 文件中:');
  console.log(`${configName}=${encryptedValue}`);
}

/**
 * 函数级注释：批量加密
 */
async function batchEncryption() {
  console.log('\n=== 批量配置加密 ===');
  console.log('请输入要加密的配置，格式: 配置名=配置值');
  console.log('输入空行结束输入\n');
  
  const configs = [];
  
  while (true) {
    const input = await askQuestion('配置 (配置名=配置值): ');
    if (!input.trim()) break;
    
    const [name, value] = input.split('=');
    if (!name || !value) {
      console.log('格式错误，请使用: 配置名=配置值');
      continue;
    }
    
    configs.push({ name: name.trim(), value: value.trim() });
  }
  
  if (configs.length === 0) {
    console.log('没有输入任何配置。');
    return;
  }
  
  console.log('\n=== 批量加密结果 ===');
  configs.forEach(config => {
    const encryptedValue = encryptValue(config.value);
    console.log(`${config.name}=${encryptedValue}`);
  });
}

/**
 * 函数级注释：更新.env文件
 * @param {string} key - 配置键
 * @param {string} value - 配置值
 */
async function updateEnvFile(key, value) {
  const envPath = path.join(__dirname, '../.env');
  
  try {
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    const lines = envContent.split('\n');
    let found = false;
    
    // 查找并更新现有配置
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }
    
    // 如果没找到，添加新配置
    if (!found) {
      lines.push(`${key}=${value}`);
    }
    
    fs.writeFileSync(envPath, lines.join('\n'));
  } catch (error) {
    console.error('更新 .env 文件失败:', error.message);
  }
}

/**
 * 函数级注释：主函数
 */
async function main() {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 交互式模式
    showUsage();
    await interactiveEncryption();
  } else if (args.length === 1) {
    // 直接加密模式
    const valueToEncrypt = args[0];
    try {
      const encrypted = encryptValue(valueToEncrypt);
      console.log('加密结果:', encrypted);
    } catch (error) {
      console.error('加密失败:', error.message);
      process.exit(1);
    }
  } else {
    console.log('参数错误！');
    showUsage();
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('程序执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = {
  encryptValue,
  updateEnvFile
};