import React, { useState, useEffect } from 'react';
import { Layout, Menu, Avatar, Typography, Divider, Button, Drawer, Input, Modal, App, Upload, Form, Select, Badge } from 'antd';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { 
  HomeOutlined, 
  TeamOutlined, 
  UserOutlined, 
  SettingOutlined,
  LogoutOutlined,
  PlusOutlined,
  MenuOutlined,
  EditOutlined,
  DeleteOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  LockOutlined,
  MailOutlined,
  PhoneOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createGroup, updateGroupAsync, deleteGroupAsync, fetchGroups, initializeGroups } from '../reducers/groups';
import { fetchTeamGroups, createTeamGroup, updateTeamGroup, deleteTeamGroup } from '../reducers/teamgroups';
import { fetchTeams } from '../reducers/teams';
import axios from '../utils/axiosConfig';
import { useThemeColors } from '../theme';
import LanguageToggle from './LanguageToggle';


const { Sider } = Layout;
const { Text } = Typography;


const Sidebar = ({ collapsed, onCollapse }) => {
  const { message, modal } = App.useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t, i18n } = useTranslation();
  const { groups } = useSelector(state => state.groups);
  const teamgroupsState = useSelector(state => state.teamgroups);
  const teams = useSelector(state => state.teams.teams);
  
  const [mobileVisible, setMobileVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [, setTheme] = useState(localStorage.getItem('theme') || 'system');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [userInfo, setUserInfo] = useState({ username: '', email: '', theme: 'system' });
  const [unreadCount, setUnreadCount] = useState(0);
  const colors = useThemeColors();
  
  /**
   * 获取用户资料
   */
  const fetchUserProfile = React.useCallback(async () => {
    try {
      const res = await axios.get('/api/users/profile');
      setAvatarUrl(res.data.avatarUrl);
      setUserInfo({
        username: res.data.username,
        email: res.data.email,
        phone: res.data.phone || '',
        theme: res.data.theme || 'system'
      });
    } catch (err) {
      message.error(t('sidebar.fetchUserProfileFailed'));
    }
  }, [message]);
  
  // 初始化数据
  useEffect(() => {
    dispatch(fetchTeams());
    const token = localStorage.getItem('token');
    if (token && groups.length === 0) {
      dispatch(fetchGroups()).catch(() => {
        dispatch(initializeGroups());
      });
    }
    fetchUserProfile();
  }, [dispatch, groups.length, fetchUserProfile]);

  // 加载团队分组
  useEffect(() => {
    if (teams.length > 0) {
      teams.forEach(team => {
        dispatch(fetchTeamGroups(team._id));
      });
    }
  }, [teams, dispatch]);

  // 获取未读消息数量
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await axios.get('/api/messages/unread/count');
        setUnreadCount(response.data.unreadCount);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    const updateUnread = () => {
      fetchUnreadCount();
    };
    window.addEventListener('unreadUpdated', updateUnread);
    return () => window.removeEventListener('unreadUpdated', updateUnread);
  }, []);

  const [editingGroup, setEditingGroup] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalType, setModalType] = useState('');
  const [parentGroupId, setParentGroupId] = useState(null);
  const [isTeamGroup, setIsTeamGroup] = useState(false);
  const [currentTeamId, setCurrentTeamId] = useState(null);
  
  /**
   * 处理设置提交
   */
  const handleSettingsSubmit = async (values) => {
    try {
      await axios.put('/api/users/profile', values);
      message.success(t('sidebar.settingsUpdateSuccess'));
      setSettingsVisible(false);
      
      // 更新本地存储的邮箱
      if (values.email) {
        localStorage.setItem('userEmail', values.email);
      }
      
      // 更新主题
      if (values.theme) {
        setTheme(values.theme);
        localStorage.setItem('theme', values.theme);
      }
      window.location.reload();
    } catch (err) {
      message.error(t('sidebar.updateFailed') + ': ' + (err.response?.data?.error || err.message));
    }
  };
  
  /**
   * 处理主题变更
   */
  const handleThemeChange = (value) => {
    setTheme(value);
    localStorage.setItem('theme', value);
    // 这里可以触发全局主题更新
  };
  
  /**
   * 处理语言切换
   * @param {string} newLang - 新的语言代码（可选，如果不传则自动切换）
   */
  const handleLanguageChange = (newLang) => {
    const targetLang = newLang || (i18n.language === 'zh' ? 'en' : 'zh');
    i18n.changeLanguage(targetLang);
    localStorage.setItem('language', targetLang);
    message.success(t('sidebar.switchLanguage'));
  };
  
  /**
   * 处理头像上传
   */
  const handleAvatarUpload = (info) => {
    if (info.file.status === 'done') {
      setAvatarUrl(info.file.response.url);
      message.success(t('sidebar.avatarUploadSuccess'));
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setMobileVisible(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getSelectedKey = () => {
    if (location.pathname.includes('/tasks')) return '1';
    if (location.pathname.includes('/teams')) return '2';
    return '1';
  };

  // 处理组编辑（个人或团队）
  const handleEditGroup = (group, isTeam = false, teamId = null) => {
    setEditingGroup(group);
    setNewGroupName(group.name);
    setModalType('edit');
    setIsTeamGroup(isTeam);
    setCurrentTeamId(teamId);
    setIsModalVisible(true);
  };

  // 处理新增组（个人或团队）
  const handleAddGroup = (parentId = null, isTeam = false, teamId = null) => {
    setParentGroupId(parentId);
    setNewGroupName('');
    setModalType(parentId ? 'addChild' : 'add');
    setIsTeamGroup(isTeam);
    setCurrentTeamId(teamId);
    setIsModalVisible(true);
  };

  // 保存组操作（个人或团队）
  const handleSaveGroup = async () => {
    if (!newGroupName.trim()) {
      message.error(t('sidebar.groupNameRequired'));
      return;
    }

    try {
      if (isTeamGroup) {
        const groupData = {
          name: newGroupName,
          type: 'custom',
          color: '#1890ff',
          icon: '📁'
        };
        if (modalType === 'edit') {
          await dispatch(updateTeamGroup({ id: editingGroup.id, updates: { name: newGroupName } })).unwrap();
          message.success(t('sidebar.teamGroupUpdateSuccess'));
          // 刷新团队组数据
          await dispatch(fetchTeamGroups(currentTeamId));
        } else {
          await dispatch(createTeamGroup({ teamId: currentTeamId, group: { ...groupData, parentId: modalType === 'addChild' ? parentGroupId : null } })).unwrap();
          message.success(modalType === 'addChild' ? t('sidebar.teamSubGroupCreateSuccess') : t('sidebar.teamGroupCreateSuccess'));
          // 刷新团队组数据
          await dispatch(fetchTeamGroups(currentTeamId));
        }
      } else {
        if (modalType === 'edit') {
          await dispatch(updateGroupAsync({ id: editingGroup.id, name: newGroupName })).unwrap();
          message.success(t('sidebar.groupUpdateSuccess'));
        } else {
          const groupData = {
            name: newGroupName,
            type: 'custom',
            color: '#1890ff',
            icon: '📁'
          };
          await dispatch(createGroup({ parentId: modalType === 'addChild' ? parentGroupId : null, group: groupData })).unwrap();
          message.success(modalType === 'addChild' ? t('sidebar.subGroupCreateSuccess') : t('sidebar.groupCreateSuccess'));
        }
      }
      setIsModalVisible(false);
      setEditingGroup(null);
      setNewGroupName('');
      setParentGroupId(null);
      setIsTeamGroup(false);
      setCurrentTeamId(null);
    } catch (error) {
      console.error('团队组操作失败:', error);
      message.error(error || t('sidebar.operationFailed'));
    }
  };

  // 删除组（个人或团队）
  const handleDeleteGroup = (groupId, isTeam = false) => {
    modal.confirm({
      title: t('sidebar.confirmDelete'),
      content: t('sidebar.confirmDeleteGroup'),
      onOk: async () => {
        try {
          if (isTeam) {
            await dispatch(deleteTeamGroup(groupId)).unwrap();
            message.success(t('sidebar.teamGroupDeleteSuccess'));
          } else {
            await dispatch(deleteGroupAsync(groupId)).unwrap();
            message.success(t('sidebar.groupDeleteSuccess'));
          }
        } catch (error) {
          message.error(error || t('sidebar.deleteFailed'));
        }
      }
    });
  };

  // 生成菜单项
  const generateMenuItems = () => {
    const taskChildren = [
      { key: '1-1', label: t('sidebar.tasks'), onClick: () => navigate('/tasks') }
    ];

    // 生成个人任务分组菜单

/**
 * 函数级注释：递归生成个人组菜单项
 * @param {Array} groups - 组数据数组
 * @param {boolean} isSubgroup - 是否为子组，用于控制添加子组按钮的显示
 * @returns {Array} 菜单项数组
 */
const generatePersonalGroupItems = (groups, isSubgroup = false) => {
  return groups.filter(group => group.id).map(group => {
    const groupItem = {
      key: `1-${group.id}`,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span onClick={() => navigate(`/tasks?group=${group.id}`)}>
            {group.children?.length > 0 ? <FolderOpenOutlined /> : <FolderOutlined />}
            <span style={{ marginLeft: 8 }}>{group.name}</span>
          </span>
          {group.type === 'custom' && (
            <div style={{ display: 'flex', gap: 4 }}>
              <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEditGroup(group); }} />
              {group.id !== 'ungrouped' && <Button type="text" size="small" icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} />}
            </div>
          )}
        </div>
      )
    };

    const filteredChildren = group.children?.filter(child => child.id) || [];
    if (filteredChildren.length > 0) {
      // 递归处理子组，传递isSubgroup=true表示这些是子组
      groupItem.children = generatePersonalGroupItems(filteredChildren, true);
      // 只在父组中添加"添加子组"按钮
      if (!isSubgroup) {
        groupItem.children.push({
          key: `1-${group.id}-add`,
          label: <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleAddGroup(group.id); }} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addSubGroup')}</Button>
        });
      }
    } else if (group.type === 'custom' && !isSubgroup) {
      // 只在父组中添加"添加子组"按钮
      groupItem.children = [{
        key: `1-${group.id}-add`,
        label: <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleAddGroup(group.id); }} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addSubGroup')}</Button>
      }];
    }
    return groupItem;
  });
};

// 添加个人分组
taskChildren.push(...generatePersonalGroupItems(groups));

taskChildren.push({
  key: '1-add-group',
  label: <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleAddGroup()} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addGroup')}</Button>
});

    // 生成团队菜单
    const teamsChildren = [
      { key: '2-1', label: t('sidebar.teams'), onClick: () => navigate('/teams') }
    ];
    teams.forEach(team => {
      const teamGroups = teamgroupsState.groupsByTeam[team._id] || [];
      const teamItem = {
        key: `2-team-${team._id}`,
        label: team.name,
        children: []
      };

      /**
       * 函数级注释：递归生成团队组菜单项
       * @param {Array} groups - 组数据数组
       * @param {string} teamId - 团队ID
       * @param {boolean} isSubgroup - 是否为子组，用于控制添加子组按钮的显示
       * @returns {Array} 菜单项数组
       */
      const generateTeamGroupItems = (groups, teamId, isSubgroup = false) => {
        return groups.filter(group => group.id).map(group => {
          const groupItem = {
            key: `2-${teamId}-${group.id}`,
            label: (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span onClick={() => navigate(`/tasks?team=${teamId}&group=${group.id}`)}>
                  {group.children?.length > 0 ? <FolderOpenOutlined /> : <FolderOutlined />}
                  <span style={{ marginLeft: 8 }}>{group.name}</span>
                </span>
                {group.type === 'custom' && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Button type="text" size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); handleEditGroup(group, true, teamId); }} />
                    {group.id !== 'ungrouped' && <Button type="text" size="small" icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id, true); }} />}
                  </div>
                )}
              </div>
            )
          };

          const filteredChildren = group.children?.filter(child => child.id) || [];
          if (filteredChildren.length > 0) {
            // 递归处理子组，传递isSubgroup=true表示这些是子组
            groupItem.children = generateTeamGroupItems(filteredChildren, teamId, true);
            // 只在父组中添加"添加子组"按钮
            if (!isSubgroup) {
              groupItem.children.push({
                key: `2-${teamId}-${group.id}-add`,
                label: <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleAddGroup(group.id, true, teamId); }} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addSubGroup')}</Button>
              });
            }
          } else if (group.type === 'custom' && !isSubgroup) {
            // 只在父组中添加"添加子组"按钮
            groupItem.children = [{
              key: `2-${teamId}-${group.id}-add`,
              label: <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); handleAddGroup(group.id, true, teamId); }} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addSubGroup')}</Button>
            }];
          }
          return groupItem;
        });
      };

      // 添加团队分组
      const teamGroupItems = generateTeamGroupItems(teamGroups, team._id);
      teamItem.children.push(...teamGroupItems);

      // 添加新增团队组按钮
      teamItem.children.push({
        key: `2-${team._id}-add-group`,
        label: <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleAddGroup(null, true, team._id)} style={{ width: '100%', textAlign: 'left' }}>{t('sidebar.addTeamGroup')}</Button>
      });

      teamsChildren.push(teamItem);
    });
    teamsChildren.push({ key: '2-2', label: (
      <Badge count={unreadCount} offset={[10, 0]} style={{ backgroundColor: colors.error || 'red' }}>
        <span>{t('sidebar.messages')}</span>
      </Badge>
    ), onClick: () => navigate('/messages') });

    return [
      { key: '1', icon: <HomeOutlined />, label: t('sidebar.tasks'), children: taskChildren },
      { key: '2', icon: <TeamOutlined />, label: t('sidebar.teams'), children: teamsChildren },
      { type: 'divider' }
    ];
  };

  const sidebarContent = (
    <motion.div
      initial={{ x: -200 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <>
        {/* 用户信息区域 */}
        <div style={{ 
          padding: '24px 16px', 
          textAlign: 'center',
          background: colors.sidebarGradient,
          color: colors.text,
          position: 'relative'
        }}
        >
          <Button 
            type="text" 
            icon={<SettingOutlined style={{ color: colors.text }} />} 
            style={{ position: 'absolute', top: 8, right: 8 }} 
            onClick={() => setSettingsVisible(true)}
          />
          <LanguageToggle 
            onChange={handleLanguageChange}
            style={{ position: 'absolute', top: 8, right: 48 }}
          />
          <Avatar size={64} icon={<UserOutlined />} style={{ marginBottom: 12 }} />
          <div>
            <Text style={{ color: colors.text, display: 'block', fontWeight: 'bold' }}>
              {userInfo.username || 'Welcome Back'}
            </Text>
            <Text style={{ color: colors.text, fontSize: '12px', opacity: 0.8 }}>
              {userInfo.email || 'user@example.com'}
            </Text>
          </div>
        </div>

        <Divider style={{ margin: 0 }} />

        {/* 导航菜单 */}
        <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto', maxHeight: 'calc(100vh - 200px)', background: colors.background }}>
          <Menu 
            mode="inline" 
            selectedKeys={[getSelectedKey()]} 
            items={generateMenuItems()}
            style={{ border: 'none' }}
          />
        </div>

        {/* 底部操作区域 */}
        <div style={{ padding: '16px', borderTop: `1px solid ${colors.defaultColor}`, background: colors.cardBackground }}>
          <Button 
            type="text" 
            icon={<LogoutOutlined />} 
            onClick={handleLogout}
            style={{ width: '100%', textAlign: 'left' }}
            danger
          >
            {t('sidebar.logout')}
          </Button>
        </div>
      </>
    </motion.div>
  );

  if (isMobile) {
    return (
      <>
        <Button
          type="primary"
          icon={<MenuOutlined />}
          onClick={() => setMobileVisible(true)}
          style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 1001,
            borderRadius: '50%',
            width: 48,
            height: 48
          }}
        />
        <Drawer
          title={t('sidebar.navigation')}
          placement="left"
          onClose={() => setMobileVisible(false)}
          open={mobileVisible}
          styles={{ body: { padding: 0 } }}
          width={280}
        >
          {sidebarContent}
        </Drawer>
        
        {/* 组管理模态框 */}
        <Modal
          title={
          modalType === 'edit' ? t('sidebar.editGroupName') : 
          modalType === 'addChild' ? t('sidebar.addSubGroup') : t('sidebar.addGroup')
        }
          open={isModalVisible}
          onOk={handleSaveGroup}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingGroup(null);
            setNewGroupName('');
            setParentGroupId(null);
          }}
          okText={t('sidebar.save')}
        cancelText={t('sidebar.cancel')}
        >
          <Input
            placeholder={t('sidebar.enterGroupName')}
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onPressEnter={handleSaveGroup}
            autoFocus
          />
        </Modal>
      </>
    );
  }

  return (
    <>
      <Sider 
        width={280} 
        collapsible
        collapsed={collapsed}
        onCollapse={onCollapse}
        style={{ 
          height: '100vh', 
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 1000,
          background: colors.background
        }}
      >
        {!collapsed && sidebarContent}
        {collapsed && (
          <div style={{ padding: '16px 8px', textAlign: 'center', background: colors.background }}>
            <Avatar size={40} icon={<UserOutlined />} style={{ marginBottom: 16 }} />
            <Menu 
              mode="inline" 
              selectedKeys={[getSelectedKey()]} 
              items={generateMenuItems().filter(item => item.key && item.key <= '2')}
              style={{ border: 'none' }}
              inlineCollapsed={true}
              defaultOpenKeys={['2']}  // 默认展开Teams菜单
            />
          </div>
        )}
      </Sider>
      
      {/* 组管理模态框 */}
      <Modal
        title={
          modalType === 'edit' ? t('sidebar.editGroupName') : 
          modalType === 'addChild' ? t('sidebar.addSubGroup') : t('sidebar.addGroup')
        }
        open={isModalVisible}
        onOk={handleSaveGroup}
        onCancel={() => {
          setIsModalVisible(false);
          setEditingGroup(null);
          setNewGroupName('');
          setParentGroupId(null);
        }}
        okText={t('sidebar.save')}
        cancelText={t('sidebar.cancel')}
      >
        <Input
          placeholder={t('sidebar.enterGroupName')}
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onPressEnter={handleSaveGroup}
          autoFocus
        />
      </Modal>
      

      {/* 用户设置模态框 */}
      <Modal
        title={t('sidebar.userSettings')}
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={500}
      >
        <SettingsForm
          onSubmit={handleSettingsSubmit}
          initialValues={userInfo}
          avatarUrl={avatarUrl}
          onAvatarChange={handleAvatarUpload}
          onThemeChange={handleThemeChange}
        />
      </Modal>
    </>
  );
}

// 函数级注释：用户设置表单组件，用于处理用户资料编辑
function SettingsForm({ onSubmit, initialValues, avatarUrl, onAvatarChange, onThemeChange }) {
  const [form] = Form.useForm();
  const { t } = useTranslation();

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onSubmit}
      style={{ marginTop: 16 }}
    >
      <Form.Item label={t('sidebar.avatar')}>
        <Upload
          name="avatar"
          listType="picture-circle"
          className="avatar-uploader"
          showUploadList={false}
          action={`${window.location.origin.replace(/:\\d+$/, '') + (window.location.port ? '' : '')}/api/users/avatar`}
          onChange={onAvatarChange}
        >
          {avatarUrl ? (
            <Avatar size={64} src={avatarUrl} />
          ) : (
            <div>
              <PlusOutlined />
              <div style={{ marginTop: 8 }}>{t('sidebar.upload')}</div>
            </div>
          )}
        </Upload>
      </Form.Item>

      <Form.Item
        label={t('sidebar.email')}
        name="email"
        rules={[{ required: true, type: 'email', message: t('sidebar.enterValidEmail') }]}
      >
        <Input prefix={<MailOutlined />} placeholder={t('sidebar.email')} />
      </Form.Item>

      <Form.Item
        label={t('sidebar.username')}
        name="username"
        rules={[{ required: true, message: t('sidebar.enterUsername') }]}
      >
        <Input prefix={<UserOutlined />} placeholder={t('sidebar.username')} />
      </Form.Item>
      <Form.Item
        label={t('sidebar.phone')}
        name="phone"
        rules={[{ pattern: /^\d{11}$/, message: t('sidebar.enterValidPhone') }]}
      >
        <Input prefix={<PhoneOutlined />} placeholder={t('sidebar.phone')} />
      </Form.Item>

      <Form.Item
        label={t('sidebar.newPassword')}
        name="password"
        rules={[{ min: 6, message: t('sidebar.passwordMinLength') }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder={t('sidebar.leaveEmptyNoChange')} />
      </Form.Item>

      <Form.Item
        label={t('sidebar.confirmPassword')}
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error(t('sidebar.passwordMismatch')));
            },
          }),
        ]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder={t('sidebar.confirmNewPassword')} />
      </Form.Item>

      <Form.Item label={t('sidebar.themeSettings')} name="theme">
        <Select onChange={onThemeChange}>
          <Select.Option value="light">{t('sidebar.lightTheme')}</Select.Option>
          <Select.Option value="dark">{t('sidebar.darkTheme')}</Select.Option>
          <Select.Option value="system">{t('sidebar.followSystem')}</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" block>
          {t('sidebar.saveSettings')}
        </Button>
      </Form.Item>
    </Form>
  );
}

export default Sidebar;