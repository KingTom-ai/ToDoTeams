const express = require('express');
const router = express.Router();
const { adminAuth, logAdminAction } = require('../middlewares/adminAuth');
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetPassword
} = require('../controllers/userController');

/**
 * @route GET /admin/users
 * @desc 获取用户列表（分页、搜索、过滤）
 * @access Admin
 */
router.get('/', adminAuth, logAdminAction('GET_USERS'), getUsers);

/**
 * @route GET /admin/users/:id
 * @desc 获取用户详情
 * @access Admin
 */
router.get('/:id', adminAuth, logAdminAction('GET_USER_DETAIL'), getUserById);

/**
 * @route POST /admin/users
 * @desc 创建用户
 * @access Admin
 */
router.post('/', adminAuth, logAdminAction('CREATE_USER'), createUser);

/**
 * @route PUT /admin/users/:id
 * @desc 更新用户
 * @access Admin
 */
router.put('/:id', adminAuth, logAdminAction('UPDATE_USER'), updateUser);

/**
 * @route DELETE /admin/users/:id
 * @desc 删除用户
 * @access Admin
 */
router.delete('/:id', adminAuth, logAdminAction('DELETE_USER'), deleteUser);

/**
 * @route PUT /admin/users/:id/reset-password
 * @desc 重置用户密码
 * @access Admin
 */
router.put('/:id/reset-password', adminAuth, logAdminAction('RESET_PASSWORD'), resetPassword);

module.exports = router;