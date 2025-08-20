const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/avatars/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// 获取用户资料
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新用户资料
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser && existingUser._id.toString() !== req.user) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const user = await User.findByIdAndUpdate(req.user, updates, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 上传头像
router.post('/avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user, { avatarUrl: `/uploads/avatars/${req.file.filename}` }, { new: true });
    res.json({ avatarUrl: user.avatarUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;