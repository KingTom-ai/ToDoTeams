const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Team = require('../models/Team');
const User = require('../models/User');
const { Message } = require('../models/Message');
const MessageService = require('../services/messageService');
const crypto = require('crypto');

function generateTeamID() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(11);
  let id = '';
  for (let i = 0; i < 11; i++) {
    id += chars[bytes[i] % chars.length];
  }
  return id;
}

// 获取用户团队
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user).populate({ path: 'teams', populate: { path: 'members.user', model: 'User', select: 'username' } });
    res.json(user.teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建团队
router.post('/', auth, async (req, res) => {
  try {
    console.log('Creating team with data:', req.body);
    console.log('User ID:', req.user);
    
    const { name } = req.body;
    
    if (!name) {
      console.log('Error: Team name is required');
      return res.status(400).json({ error: 'Team name is required' });
    }
    
    const teamID = generateTeamID();
    console.log('Generated team ID:', teamID);
    
    const team = new Team({ name, teamID, members: [{user: req.user, role: 'creator'}], owner: req.user });
    await team.save();
    console.log('Team created successfully:', team);
    
    const user = await User.findById(req.user);
    if (!user) {
      console.log('Error: User not found');
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.teams.push(team._id);
    await user.save();
    console.log('User teams updated successfully');
    
    // 使用MessageService发送团队创建通知
    await MessageService.notifyTeamCreation(team._id, team.name, req.user);
    
    res.status(201).json(team);
  } catch (err) {
    console.log('Error creating team:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// 加入团队
/**
 * 用户加入团队的路程处理函数
 * @param {string} teamID - 团队ID参数
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 */
router.post('/:teamID/join', auth, async (req, res) => {
  try {
    const team = await Team.findOne({ teamID: req.params.teamID });
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    if (team.members.some(m => m.user.toString() === req.user)) return res.status(400).json({ msg: 'Already a member' });
    team.members.push({user: req.user, role: 'member'});
    await team.save();
    const user = await User.findById(req.user);
    user.teams.push(team._id);
    await user.save();
    // 使用MessageService发送成员加入通知
    await MessageService.notifyMemberJoin(team._id, req.user, team.owner);
    
    const creatorId = team.owner.toString();
    const content = `${user.username} 已加入团队 ${team.name}`;
    req.app.get('io').to(req.user).emit('notification', { message: content });
    req.app.get('io').to(creatorId).emit('notification', { message: content });
    res.json(team);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 删除团队
router.delete('/:id', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    const user = await User.findById(req.user);
    if (team.owner.toString() !== req.user && user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    // 使用MessageService发送团队删除通知
    const memberIds = team.members.map(m => m.user.toString());
    await MessageService.notifyTeamDeletion(team._id, team.name, req.user, memberIds);
    
    const content = `团队 ${team.name} 已被删除`;
    memberIds.forEach(id => req.app.get('io').to(id).emit('notification', { message: content }));
    await Team.deleteOne({ _id: team._id });
    await User.updateMany({ teams: team._id }, { $pull: { teams: team._id } });
    res.json({ msg: 'Team deleted' });
  } catch (err) {
    console.log('Error in delete:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新成员角色
router.put('/:id/members/:userID', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    const member = team.members.find(m => m.user.toString() === req.params.userID);
    if (!member) return res.status(404).json({ msg: 'Member not found' });
    const requester = team.members.find(m => m.user.toString() === req.user);
    if (requester.role !== 'creator' && requester.role !== 'manager') return res.status(403).json({ msg: 'Not authorized' });
    const changedUser = await User.findById(req.params.userID);
    if (req.body.role) {
      const oldRole = member.role;
      member.role = req.body.role;
      
      // 使用MessageService发送角色变更通知
      await MessageService.notifyRoleChange(team._id, req.params.userID, oldRole, req.body.role, req.user);
      
      const roleContent = `${changedUser.username} 的角色已更改为 ${req.body.role} 在团队 ${team.name}`;
      req.app.get('io').to(req.params.userID).emit('notification', { message: roleContent });
      const managers = team.members.filter(m => m.role === 'manager').map(m => m.user.toString());
      managers.forEach(m => req.app.get('io').to(m).emit('notification', { message: roleContent }));
    }
    if (req.body.permissions) {
      member.permissions = req.body.permissions;
      
      // 使用MessageService发送权限变更通知
      await MessageService.notifyPermissionChange(team._id, req.params.userID, '团队权限', true, req.user);
      
      const permContent = `${changedUser.username} 的权限已更新 在团队 ${team.name}`;
      req.app.get('io').to(req.params.userID).emit('notification', { message: permContent });
    }
    await team.save();
    const populatedTeam = await Team.findById(team._id).populate('members.user', 'username');
    res.json(populatedTeam);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 删除成员
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ msg: 'Team not found' });
    const memberIndex = team.members.findIndex(m => m.user.toString() === req.params.userId);
    if (memberIndex === -1) return res.status(404).json({ msg: 'Member not found' });
    const member = team.members[memberIndex];
    if (member.role === 'creator') return res.status(403).json({ msg: 'Cannot remove creator' });
    const requester = team.members.find(m => m.user.toString() === req.user);
    if (requester.role !== 'creator' && requester.role !== 'manager') return res.status(403).json({ msg: 'Not authorized' });
    team.members.splice(memberIndex, 1);
    await team.save();
    const removedUser = await User.findById(req.params.userId);
    
    // 使用MessageService发送成员移除通知
    await MessageService.notifyMemberLeave(team._id, req.params.userId, req.user, true);
    
    const content = `${removedUser.username} 已被从团队 ${team.name} 中移除`;
    req.app.get('io').to(req.params.userId).emit('notification', { message: content });
    const creatorId = team.owner.toString();
    req.app.get('io').to(creatorId).emit('notification', { message: content });
    await User.findByIdAndUpdate(req.params.userId, { $pull: { teams: team._id } });
    res.json({ msg: 'Member removed' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;