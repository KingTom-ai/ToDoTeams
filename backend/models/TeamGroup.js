const mongoose = require('mongoose');

const TeamGroupSchema = new mongoose.Schema({
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
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamGroup',
    default: null
  },
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TeamGroup'
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
  }]
}, {
  timestamps: true
});

// 索引优化
TeamGroupSchema.index({ teamId: 1, parentId: 1 });
TeamGroupSchema.index({ teamId: 1, order: 1 });

module.exports = mongoose.model('TeamGroup', TeamGroupSchema);