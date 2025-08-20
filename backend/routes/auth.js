const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { getConfigValue } = require('../utils/encryption');

// 注册
router.post('/register', async (req, res) => {
  console.log('Received register request:', req.body);
  try {
    const { username, email, phone, password, publicKey } = req.body;
    if (!email && !phone) return res.status(400).json({ error: 'Email or phone is required' });
    const existingUser = await User.findOne({ $or: [{ username }, { email }, { phone }] });
    if (existingUser) {
      if (existingUser.username === username) return res.status(400).json({ error: 'Username already exists' });
      if (existingUser.email === email) return res.status(400).json({ error: 'Email already exists' });
      if (existingUser.phone === phone) return res.status(400).json({ error: 'Phone already exists' });
    }
    const user = new User({ username, email, phone, password, publicKey });
    await user.save();
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token });
  } catch (err) {
    console.log('Register error:', err);
    res.status(400).json({ error: err.message });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    console.log('=== Login Debug Info ===');
    console.log('Login attempt with identifier:', identifier);
    console.log('Password provided:', password ? 'Yes' : 'No');
    console.log('Password length:', password ? password.length : 0);
    
    const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }, { phone: identifier }] });
    if (!user) {
      console.log('User not found for identifier:', identifier);
      return res.status(401).json({ error: 'Account does not exist' });
    }
    
    console.log('User found:', user.username, user.email, user.role);
    console.log('User password hash:', user.password ? user.password.substring(0, 10) + '...' : 'No password');
    
    const passwordMatch = await user.comparePassword(password);
    console.log('Password match result:', passwordMatch);
    
    if (!passwordMatch) {
      console.log('Password comparison failed');
      return res.status(401).json({ error: 'Incorrect password' });
    }
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * 忘记密码功能 - 通过邮箱发送重置链接
 * @param {Object} req - 请求对象，包含email参数
 * @param {Object} res - 响应对象
 */
// router.post('/forgot-password', ...) 片段
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('Forgot password request for email:', email);
    
    if (!email) {
      return res.status(400).json({ msg: 'Email is required' });
    }
    
    const user = await User.findOne({ email: email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({ msg: 'User not found' });
    }
    
    const resetToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    /**
     * 智能生成重置密码前端链接（前后端同端口，由后端托管）
     * 优先级：origin > referer > x-forwarded-host/host
     * 使用请求本身的协议与主机（支持代理的 x-forwarded-proto/host），不再强制切换到 3000 端口
     */
    console.log('=== 重置密码链接生成调试信息 ===');
    console.log('Request headers - Origin:', req.headers.origin);
    console.log('Request headers - Referer:', req.headers.referer);
    console.log('Request headers - Host:', req.get('host'));
    console.log('Environment FRONTEND_URL:', process.env.FRONTEND_URL);
    
    let frontendUrl = null;

    // 解析 origin 或 referer（如果存在）
    const tryParseUrlHost = (urlStr) => {
      try {
        const u = new URL(urlStr);
        return { protocol: u.protocol.replace(':', ''), host: u.host };
      } catch (e) {
        return null;
      }
    };

    let parsed = null;
    if (req.headers.origin) {
      parsed = tryParseUrlHost(req.headers.origin);
    }
    if (!parsed && req.headers.referer) {
      parsed = tryParseUrlHost(req.headers.referer);
    }

    const proto = (req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http')).toString();
    const fallbackHost = req.headers['x-forwarded-host'] || req.get('host');
    const protocol = parsed?.protocol || proto;
    const host = parsed?.host || fallbackHost;

    if (protocol && host) {
      frontendUrl = `${protocol}://${host}`;
      console.log('✓ 使用协议与主机生成前端URL:', frontendUrl);
    }

    // 如果依然无法确定（极端情况），再回退到环境变量
    if (!frontendUrl && process.env.FRONTEND_URL) {
      frontendUrl = process.env.FRONTEND_URL;
      console.log('✓ 使用环境变量FRONTEND_URL:', frontendUrl);
    }

    // 最终兜底
    if (!frontendUrl) {
      frontendUrl = `http://localhost:${process.env.PORT || 5001}`;
      console.log('✓ 使用本地兜底前端URL:', frontendUrl);
    }

    // 统一去掉尾部斜杠再拼接路径
    const resetLink = `${frontendUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;
    console.log('Final generated reset link:', resetLink);
    // 配置QQ邮箱SMTP发送
    // 函数级注释：获取解密后的邮箱配置
    const emailUser = getConfigValue(process.env.EMAIL_USER);
    const emailPass = getConfigValue(process.env.EMAIL_PASS);
    
    console.log('Configuring SMTP with user:', emailUser);
    const transporter = nodemailer.createTransport({
      host: 'smtp.qq.com',
      port: 465,
      secure: true, // 使用SSL
      auth: {
        user: emailUser,
        pass: emailPass
      },
      // 添加调试选项
      debug: true,
      logger: true
    });
    
    // 验证SMTP连接
    try {
      await transporter.verify();
      console.log('SMTP server connection verified successfully');
    } catch (verifyErr) {
      console.error('SMTP verification failed:', verifyErr);
      return res.status(500).json({ 
        msg: 'Email service configuration error', 
        error: verifyErr.message 
      });
    }
    
    // 发送邮件
    try {
      const mailOptions = {
        from: `"TodoTeam" <${emailUser}>`,
        to: user.email,
        subject: '密码重置链接 - TodoTeam',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>密码重置请求</h2>
            <p>您好，</p>
            <p>我们收到了您的密码重置请求。请点击下面的链接来重置您的密码：</p>
            <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">重置密码</a></p>
            <p>如果按钮无法点击，请复制以下链接到浏览器地址栏：</p>
            <p>${resetLink}</p>
            <p>此链接将在1小时后失效。</p>
            <p>如果您没有请求重置密码，请忽略此邮件。</p>
            <br>
            <p>TodoTeam 团队</p>
          </div>
        `,
        text: `您好，我们收到了您的密码重置请求。请访问以下链接来重置您的密码：${resetLink} 此链接将在1小时后失效。如果您没有请求重置密码，请忽略此邮件。`
      };
      
      console.log('Sending email to:', user.email);
      const info = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', info.messageId);
      console.log('Email response:', info.response);
    } catch (sendErr) {
      console.error('详细邮件发送错误:', {
        message: sendErr.message,
        code: sendErr.code,
        command: sendErr.command,
        response: sendErr.response,
        responseCode: sendErr.responseCode
      });
      return res.status(500).json({ 
        msg: 'Failed to send reset email', 
        error: sendErr.message,
        details: sendErr.code || 'SMTP_ERROR'
      });
    }
    res.json({ msg: 'Reset link sent to your registered email' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ msg: 'Password reset successful' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;