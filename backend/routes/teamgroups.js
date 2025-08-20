const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const TeamGroup = require('../models/TeamGroup');

// 获取团队的所有分组
const populateChildren = async (groups) => {
  for (let group of groups) {
    const children = await TeamGroup.find({ 
      teamId: group.teamId, 
      parentId: group._id 
    }).sort({ order: 1 });
    
    if (children.length > 0) {
      group.children = await populateChildren(children);
    } else {
      group.children = [];
    }
  }
  return groups;
};
router.get('/:teamId', auth, async (req, res) => {
  try {
    const topLevelGroups = await TeamGroup.find({ 
      teamId: req.params.teamId, 
      parentId: null 
    }).sort({ order: 1 });
    const groupsWithChildren = await populateChildren(topLevelGroups);
    res.json(groupsWithChildren);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 创建分组
router.post('/:teamId', auth, async (req, res) => {
  try {
    const { name, type = 'custom', parentId, color = '#1890ff', icon = '📁' } = req.body;
    const newGroup = new TeamGroup({
      name,
      type,
      teamId: req.params.teamId,
      parentId,
      color,
      icon,
      createdBy: req.user // 添加创建者ID（req.user已经是userId）
    });
    await newGroup.save();

    if (parentId) {
      await TeamGroup.findByIdAndUpdate(parentId, { $push: { children: newGroup._id } });
    }

    res.json(newGroup);
  } catch (err) {
    console.error('创建团队组失败:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// 更新分组
router.put('/:id', auth, async (req, res) => {
  try {
    const updatedGroup = await TeamGroup.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedGroup);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 删除分组
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await TeamGroup.findById(req.params.id);
    if (group.parentId) {
      await TeamGroup.findByIdAndUpdate(group.parentId, { $pull: { children: group._id } });
    }
    await TeamGroup.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;