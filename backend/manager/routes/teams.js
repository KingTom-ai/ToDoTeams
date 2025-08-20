const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getTeams,
  getTeamById,
  createTeam,
  updateTeam,
  deleteTeam,
  addMember,
  removeMember,
  updateMemberRole
} = require('../controllers/teamController');

/**
 * @route GET /admin/teams
 * @desc 获取团队列表（包括成员数、任务数）
 * @access Admin
 */
router.get('/', adminAuth, logAdminAction('GET_TEAMS'), getTeams);

/**
 * @route GET /admin/teams/:id
 * @desc 获取团队详情
 * @access Admin
 */
router.get('/:id', adminAuth, logAdminAction('GET_TEAM_DETAIL'), getTeamById);

/**
 * @route POST /admin/teams
 * @desc 创建团队
 * @access Admin
 */
router.post('/', adminAuth, logAdminAction('CREATE_TEAM'), createTeam);

/**
 * @route PUT /admin/teams/:id
 * @desc 更新团队
 * @access Admin
 */
router.put('/:id', adminAuth, logAdminAction('UPDATE_TEAM'), updateTeam);

/**
 * @route DELETE /admin/teams/:id
 * @desc 删除团队
 * @access Admin
 */
router.delete('/:id', adminAuth, logAdminAction('DELETE_TEAM'), deleteTeam);

/**
 * @route POST /admin/teams/:id/members
 * @desc 添加团队成员
 * @access Admin
 */
router.post('/:id/members', adminAuth, logAdminAction('ADD_TEAM_MEMBER'), addMember);

/**
 * @route DELETE /admin/teams/:id/members/:userId
 * @desc 移除团队成员
 * @access Admin
 */
router.delete('/:id/members/:userId', adminAuth, logAdminAction('REMOVE_TEAM_MEMBER'), removeMember);

/**
 * @route PUT /admin/teams/:id/members/:userId
 * @desc 更新成员角色
 * @access Admin
 */
router.put('/:id/members/:userId', adminAuth, logAdminAction('UPDATE_MEMBER_ROLE'), updateMemberRole);

module.exports = router;