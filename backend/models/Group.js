const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // 管理员创建的组可能不属于特定用户
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group'
  }],
  order: {
    type: Number,
    default: 0
  },
  color: {
    type: String,
    default: '#1890ff'
  },
  icon: {
    type: String,
    default: '📁'
  },
  collapsed: {
    type: Boolean,
    default: false
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'delete', 'manage']
  }],
  isGlobal: {
    type: Boolean,
    default: false // 是否为全局组（所有用户可见）
  }
}, {
  timestamps: true
});

// 索引优化
GroupSchema.index({ userId: 1, parentId: 1 });
GroupSchema.index({ userId: 1, order: 1 });

module.exports = mongoose.model('Group', GroupSchema);