const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getGroups,
  getGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  getTeamGroups,
  getTeamGroupById,
  createTeamGroup,
  updateTeamGroup,
  deleteTeamGroup
} = require('../controllers/groupController');

// 组管理路由

/**
 * @route GET /api/admin/groups
 * @desc 获取组列表
 * @access Admin
 */
router.get('/', adminAuth, getGroups);

/**
 * @route GET /api/admin/groups/:id
 * @desc 获取组详情
 * @access Admin
 */
router.get('/:id', adminAuth, getGroupById);

/**
 * @route POST /api/admin/groups
 * @desc 创建组
 * @access Admin
 */
router.post('/', adminAuth, logAdminAction('create_group'), createGroup);

/**
 * @route PUT /api/admin/groups/:id
 * @desc 更新组
 * @access Admin
 */
router.put('/:id', adminAuth, logAdminAction('update_group'), updateGroup);

/**
 * @route DELETE /api/admin/groups/:id
 * @desc 删除组
 * @access Admin
 */
router.delete('/:id', adminAuth, logAdminAction('delete_group'), deleteGroup);

// 团队组管理路由

/**
 * @route GET /api/admin/groups/team-groups
 * @desc 获取团队组列表
 * @access Admin
 */
router.get('/team-groups', adminAuth, getTeamGroups);

/**
 * @route GET /api/admin/groups/team-groups/:id
 * @desc 获取团队组详情
 * @access Admin
 */
router.get('/team-groups/:id', adminAuth, getTeamGroupById);

/**
 * @route POST /api/admin/groups/team-groups
 * @desc 创建团队组
 * @access Admin
 */
router.post('/team-groups', adminAuth, logAdminAction('create_team_group'), createTeamGroup);

/**
 * @route PUT /api/admin/groups/team-groups/:id
 * @desc 更新团队组
 * @access Admin
 */
router.put('/team-groups/:id', adminAuth, logAdminAction('update_team_group'), updateTeamGroup);

/**
 * @route DELETE /api/admin/groups/team-groups/:id
 * @desc 删除团队组
 * @access Admin
 */
router.delete('/team-groups/:id', adminAuth, logAdminAction('delete_team_group'), deleteTeamGroup);

module.exports = router;