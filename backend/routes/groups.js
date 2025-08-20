const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const auth = require('../middleware/auth');

// 获取用户的所有组（包含层级结构）
router.get('/', auth, async (req, res) => {
  try {
    // 获取所有顶级组（parentId为null）
    const topLevelGroups = await Group.find({ 
      userId: req.user, 
      parentId: null 
    }).sort({ order: 1 });

    // 递归获取子组
    const populateChildren = async (groups) => {
      for (let group of groups) {
        const children = await Group.find({ 
          userId: req.user, 
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

    const groupsWithChildren = await populateChildren(topLevelGroups);
    res.json(groupsWithChildren);
  } catch (err) {
    console.error('Error fetching groups:', err);
    res.status(500).json({ error: err.message });
  }
});

// 创建新组
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating group with data:', req.body);
    console.log('User ID:', req.user);
    const { name, parentId, type = 'custom', color, icon } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // 计算order值（在同级组中的位置）
    const siblingCount = await Group.countDocuments({
      userId: req.user,
      parentId: parentId || null
    });

    const group = new Group({
      name: name.trim(),
      type,
      userId: req.user,
      createdBy: req.user,
      parentId: parentId || null,
      order: siblingCount,
      color: color || '#1890ff',
      icon: icon || '📁',
      children: []
    });

    await group.save();
    
    // 如果有父组，更新父组的children数组
    if (parentId) {
      await Group.findByIdAndUpdate(parentId, {
        $push: { children: group._id }
      });
    }

    console.log('Group created successfully:', group);
    res.status(201).json(group);
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(400).json({ error: err.message });
  }
});

// 更新组
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, color, icon, collapsed } = req.body;
    
    const group = await Group.findOne({ _id: req.params.id, userId: req.user });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 更新字段
    if (name !== undefined) group.name = name.trim();
    if (color !== undefined) group.color = color;
    if (icon !== undefined) group.icon = icon;
    if (collapsed !== undefined) group.collapsed = collapsed;

    await group.save();
    res.json(group);
  } catch (err) {
    console.error('Error updating group:', err);
    res.status(400).json({ error: err.message });
  }
});

// 删除组
router.delete('/:id', auth, async (req, res) => {
  try {
    const group = await Group.findOne({ _id: req.params.id, userId: req.user });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 递归删除所有子组
    const deleteGroupAndChildren = async (groupId) => {
      const children = await Group.find({ parentId: groupId, userId: req.user });
      for (let child of children) {
        await deleteGroupAndChildren(child._id);
      }
      await Group.findByIdAndDelete(groupId);
    };

    await deleteGroupAndChildren(req.params.id);
    
    // 从父组的children数组中移除
    if (group.parentId) {
      await Group.findByIdAndUpdate(group.parentId, {
        $pull: { children: group._id }
      });
    }

    res.json({ message: 'Group deleted successfully' });
  } catch (err) {
    console.error('Error deleting group:', err);
    res.status(500).json({ error: err.message });
  }
});

// 重新排序组
router.put('/:id/reorder', auth, async (req, res) => {
  try {
    const { newOrder, newParentId } = req.body;
    
    const group = await Group.findOne({ _id: req.params.id, userId: req.user });
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // 更新组的位置和父级
    group.order = newOrder;
    if (newParentId !== undefined) {
      // 从原父组移除
      if (group.parentId) {
        await Group.findByIdAndUpdate(group.parentId, {
          $pull: { children: group._id }
        });
      }
      
      // 添加到新父组
      group.parentId = newParentId;
      if (newParentId) {
        await Group.findByIdAndUpdate(newParentId, {
          $push: { children: group._id }
        });
      }
    }

    await group.save();
    res.json(group);
  } catch (err) {
    console.error('Error reordering group:', err);
    res.status(400).json({ error: err.message });
  }
});

// 初始化默认组（用于新用户）
router.post('/initialize', auth, async (req, res) => {
  try {
    // 检查用户是否已有组
    const existingGroups = await Group.find({ userId: req.user });
    if (existingGroups.length > 0) {
      return res.json({ message: 'Groups already initialized' });
    }

    // 创建默认组
    const defaultGroups = [
      {
        name: 'Work Projects',
        type: 'system',
        userId: req.user,
        order: 0,
        icon: '💼',
        color: '#1890ff'
      },
      {
        name: 'Personal',
        type: 'system',
        userId: req.user,
        order: 1,
        icon: '🏠',
        color: '#52c41a'
      }
    ];

    const createdGroups = await Group.insertMany(defaultGroups);
    
    // 为Work Projects创建子组
    const workProject = createdGroups[0];
    const learningGroup = new Group({
      name: 'Learning',
      type: 'system',
      userId: req.user,
      parentId: workProject._id,
      order: 0,
      icon: '📚',
      color: '#722ed1'
    });
    
    await learningGroup.save();
    
    // 更新父组的children数组
    workProject.children = [learningGroup._id];
    await workProject.save();

    res.json({ message: 'Default groups initialized successfully' });
  } catch (err) {
    console.error('Error initializing groups:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;