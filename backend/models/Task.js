const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  status: { type: String, default: 'pending' },
  priority: { type: String, default: 'medium' },
  dueDate: { type: Date },
  isFavorite: { type: Boolean, default: false },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // 分配给的用户
  group: { type: String, default: 'ungrouped' }, // 个人任务分组
  teamGroup: { type: String, default: 'ungrouped' }, // 团队任务分组
  attachments: [{
    filename: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [{
    text: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  steps: [{
    text: { type: String, required: true },
    completed: { type: Boolean, default: false },
    order: { type: Number, required: true }
  }],
  createdAt: { type: Date, default: Date.now }
});


module.exports = mongoose.model('Task', taskSchema);