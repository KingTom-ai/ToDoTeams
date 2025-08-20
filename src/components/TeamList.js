import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Card,
  Space,
  Tag,
  Avatar,
  Tooltip,
  Row,
  Col,
  Statistic,
  Typography,
  Empty,
  Popconfirm,
  App,
  Select,
  Tabs,
  Tree
} from 'antd';
import { 
  PlusOutlined,
  TeamOutlined,
  UserOutlined,
  DeleteOutlined,
  SearchOutlined,
  CopyOutlined,
  UsergroupAddOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from '../utils/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useThemeColors } from '../theme';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTeams, createTeamAsync, deleteTeamAsync } from '../reducers/teams';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

const TeamList = () => {
  const { t } = useTranslation();
  
  /**
   * 函数级注释：生成简化的权限树数据
   * 只包含read和write两种基本权限，移除复杂的task和group分层权限
   * @returns {Array} 简化的权限树结构
   */
  const useGeneratePermissionTree = () => {
    return [
      { key: 'write', title: t('teams.writePermission'), isLeaf: true }
    ];
  };
  
  const permissionTreeData = useGeneratePermissionTree();
  const { message } = App.useApp();
  const dispatch = useDispatch();
  const teams = useSelector(state => state.teams.teams);
  const loading = useSelector(state => state.teams.loading);
  const [visible, setVisible] = useState(false);
  const [joinVisible, setJoinVisible] = useState(false);
  const [form] = Form.useForm();
  const [joinForm] = Form.useForm();
  const [membersVisible, setMembersVisible] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [requesterRole, setRequesterRole] = useState('member'); // Assume default, update based on auth
const [settingsVisible, setSettingsVisible] = useState(false);
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        setVisible(true);
      }
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault();
        setJoinVisible(true);
      }
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        document.querySelector('.ant-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 使用Redux获取团队数据
  useEffect(() => {
    dispatch(fetchTeams());
  }, [dispatch]);

  // Filter teams based on search text
  const getFilteredTeams = useCallback(() => {
    if (!searchText) return teams;
    return teams.filter(team => 
      team.name.toLowerCase().includes(searchText.toLowerCase()) ||
      team.teamID.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [teams, searchText]);

  // Copy team ID to clipboard
  const copyTeamId = (teamId) => {
    navigator.clipboard.writeText(teamId);
    message.success(t('teams.teamIdCopied'));
  };

  // Get team statistics with unique members across all teams
  const getTeamStats = () => {
    const totalTeams = teams.length;
    const uniqueMembers = new Set();
    teams.forEach(team => {
      team.members.forEach(member => {
        uniqueMembers.add(member.user._id);
      });
    });
    const totalMembers = uniqueMembers.size;
    const averageMembers = totalTeams > 0 ? Math.round(totalMembers / totalTeams) : 0;
    return { totalTeams, totalMembers, averageMembers };
  };

  /**
   * 处理团队创建的函数
   * @param {Object} values - 表单值
   */
  const handleCreate = async (values) => {
    try {
      await dispatch(createTeamAsync(values)).unwrap();
      message.success(t('teams.teamCreated'));
      setVisible(false);
      form.resetFields();
      // Redux在fulfilled后已把新团队push到state.teams，无需额外fetch
    } catch (err) {
      console.error(err);
      if (err?.status === 401 || err?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        message.error(t('teams.sessionExpired'));
      } else {
        message.error(t('teams.createTeamFailed'));
      }
    }
  };

  const handleJoin = async (values) => {
    try {
      await axios.post(`/api/teams/${values.teamId}/join`, {});
      message.success(t('teams.joinedTeam'));
      setJoinVisible(false);
      joinForm.resetFields();
      dispatch(fetchTeams());
    } catch (err) {
      if (err.response && err.response.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        message.error(t('teams.sessionExpired'));
      } else {
        message.error(t('teams.joinFailed'));
      }
    }
  };

  /**
   * 处理团队删除的函数
   * @param {string} id - 团队ID
   */
  const handleDelete = async (id) => {
    try {
      await dispatch(deleteTeamAsync(id)).unwrap();
      message.success(t('teams.teamDeleted'));
      
      // 检查当前是否在被删除的团队页面
      const currentPath = window.location.pathname;
      if (currentPath.includes(`/teams/${id}`)) {
        // 如果在被删除的团队页面，导航回团队列表页面
        navigate('/teams');
      }
      
      // Redux在fulfilled后已从state.teams中过滤该团队，无需额外fetch
    } catch (err) {
      console.error(err);
      if (err?.status === 401 || err?.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
        message.error(t('teams.sessionExpired'));
      } else {
        message.error(t('teams.deleteFailed'));
      }
    }
  };

  // Function to get color for avatar
  const colors = useThemeColors();
  const getColor = (index) => { 
    return colors.avatarColors[index % colors.avatarColors.length]; 
  };

  // Function to handle role change
  const handleRoleChange = async (teamId, userId, role) => {
    try {
      const response = await axios.put(`/api/teams/${teamId}/members/${userId}`, { role });
      message.success(t('teams.roleUpdated'));
      const updatedTeam = response.data;
      setSelectedTeam(updatedTeam);
      setSelectedMembers(updatedTeam.members);
      // Redux会自动更新teams状态，不需要手动更新setTeams
      dispatch(fetchTeams());
    } catch (err) {
      message.error(t('teams.updateFailed'));
    }
  };

  // Function to generate invite link
  const generateInviteLink = (teamID) => { 
    const link = `${window.location.origin}/join?teamID=${teamID}`; 
    navigator.clipboard.writeText(link); 
    message.success(t('teams.inviteLinkCopied')); 
  };

  // Inside the TeamList component, add state for current user if needed
  // Assume currentUserId is stored in localStorage
  const currentUserId = localStorage.getItem('userId');

  // Function to show team settings
  const showSettings = (team) => {
    // 确保team对象完整，包含所有成员的用户名
    const fullTeam = teams.find(t => t._id === team._id) || team;
    setSelectedTeam(fullTeam);
    setSelectedMembers(fullTeam.members);
    const currentMember = fullTeam.members.find(m => m.user._id === currentUserId);
    setRequesterRole(currentMember ? currentMember.role : 'member');
    setSettingsVisible(true);
  };

  // Function to show team members
  const showMembers = (members, team) => { 
    setSelectedMembers(members); 
    setSelectedTeam(team); 
    setMembersVisible(true);
    const currentMember = members.find(m => m.user._id === currentUserId);
    setRequesterRole(currentMember ? currentMember.role : 'member');
  };

  // Function to handle remove member
  const handleRemoveMember = async (teamId, userId) => {
    try {
      await axios.delete(`/api/teams/${teamId}/members/${userId}`);
      setSelectedMembers(prev => prev.filter(m => m.user._id !== userId));
      message.success(t('teams.memberRemoved'));
      dispatch(fetchTeams());
    } catch (err) {
      message.error(t('teams.removeFailed'));
    }
  };

  // Add handlePermissionChange function
  // Function to handle permission change
  
  /**
   * 函数级注释：获取用户已选中的权限
   * 简化权限结构，只返回read和write权限状态
   * @param {Object} permissions - 用户权限对象
   * @returns {Array} 已选中的权限键数组
   */
  const getCheckedPermissions = (permissions = {}) => {
    const checked = [];
    if (permissions.write) checked.push('write');
    return checked;
  };
  /**
   * 函数级注释：处理权限变更
   * 简化权限结构，只处理read和write两种基本权限
   * @param {string} teamId - 团队ID
   * @param {string} userId - 用户ID
   * @param {Array|Object} checkedKeysValue - 选中的权限键
   */
  const handlePermissionChange = async (teamId, userId, checkedKeysValue) => {
    const checkedKeys = Array.isArray(checkedKeysValue) ? checkedKeysValue : checkedKeysValue.checked || [];
    const permissions = {
      write: checkedKeys.includes('write')
    };
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`/api/teams/${teamId}/members/${userId}`, 
        { permissions }, 
        { headers: { 'x-auth-token': token } }
      );
      message.success(t('teams.permissionUpdated'));
      const updatedTeam = response.data;
      setSelectedTeam(updatedTeam);
      setSelectedMembers(updatedTeam.members);
      dispatch(fetchTeams());
    } catch (error) {
      message.error(t('teams.permissionUpdateFailed'));
    }
  };

  const columns = [
    {
      title: t('teams.teamName'),
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <Space>
          <Avatar icon={<TeamOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: t('teams.teamId'),
      dataIndex: 'teamID',
      key: 'teamID',
      render: (teamID) => (
        <Space>
          <Text code>{teamID}</Text>
          <Tooltip title={t('teams.copyTeamId')}>
            <Button 
              type="text" 
              size="small" 
              icon={<CopyOutlined />} 
              onClick={() => copyTeamId(teamID)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: t('teams.members'),
      dataIndex: 'members',
      key: 'members',
      render: (members, record) => (
        <Space>
          <Tag color="blue" icon={<UserOutlined />}>
            {members.length} {members.length === 1 ? t('teams.member') : t('teams.members')}
          </Tag>
          <Button 
            type="link" 
            size="small"
            onClick={() => showMembers(members, record)}
          >
            {t('teams.view')}
          </Button>
        </Space>
      ),
    },
    {
      title: t('teams.created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Text type="secondary">
          {new Date(date).toLocaleDateString()}
        </Text>
      ),
    },
    {
      title: t('teams.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title={t('teams.teamSettings')}>
            <Button 
              type="text" 
              icon={<SettingOutlined />}
              onClick={() => showSettings(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('teams.deleteTeam')}
            description={t('teams.deleteConfirmation')}
            onConfirm={() => handleDelete(record._id)}
            okText={t('teams.yes')}
            cancelText={t('teams.no')}
          >
            <Tooltip title={t('teams.deleteTeam')}>
              <Button 
                type="text" 
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const stats = getTeamStats();
  const filteredTeams = getFilteredTeams();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      style={{ padding: '0 24px 24px 24px' }}
    >
      {/* Statistics Cards */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card className="task-card">
            <Statistic
              title={t('teams.totalTeams')}
              value={stats.totalTeams}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="task-card">
            <Statistic
              title={t('teams.totalMembers')}
              value={stats.totalMembers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="task-card">
            <Statistic
              title={t('teams.avgMembersPerTeam')}
              value={stats.averageMembers}
              prefix={<UsergroupAddOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Header and Actions */}
      <Card className="task-card" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle" gutter={16}>
          <Col xs={24} md={12}>
            <Title level={3} style={{ margin: 0 }}>
              <TeamOutlined /> {t('teams.teamManagement')}
            </Title>
          </Col>
          <Col xs={24} md={12}>
            <Row justify="end" gutter={8}>
              <Col>
                <Search
                  placeholder={t('teams.searchTeams')}
                  allowClear
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: 200 }}
                  prefix={<SearchOutlined />}
                />
              </Col>
              <Col>
                <Space>
                  <Tooltip title={t('teams.joinTeamShortcut')}>
                    <Button 
                      icon={<UsergroupAddOutlined />} 
                      onClick={() => setJoinVisible(true)}
                    >
                      {t('teams.joinTeam')}
                    </Button>
                  </Tooltip>
                  <Tooltip title={t('teams.createTeamShortcut')}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={() => setVisible(true)}
                    >
                      {t('teams.createTeam')}
                    </Button>
                  </Tooltip>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* Teams Table */}
      <Card className="task-card">
        {filteredTeams.length === 0 && !loading ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              searchText ? t('teams.noTeamsFound') : t('teams.noTeamsYet')
            }
          >
            {!searchText && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setVisible(true)}>
                {t('teams.createFirstTeam')}
              </Button>
            )}
          </Empty>
        ) : (
          <Table 
            columns={columns} 
            dataSource={filteredTeams} 
            rowKey="_id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => t('teams.paginationTotal', { start: range[0], end: range[1], total }),
            }}
            scroll={{ x: 800 }}
          />
        )}
      </Card>
      {/* Create Team Modal */}
      <Modal
        title={
          <Space>
            <TeamOutlined />
            <span>{t('teams.createNewTeam')}</span>
          </Space>
        }
        open={visible}
        onCancel={() => {
          setVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        width={500}
        destroyOnHidden
      >
        <Form 
          form={form} 
          onFinish={handleCreate}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item 
            name="name" 
            label={t('teams.teamName')}
            rules={[
              { required: true, message: t('teams.enterTeamName') },
              { min: 3, message: t('teams.teamNameMinLength') },
              { max: 50, message: t('teams.teamNameMaxLength') }
            ]}
          >
            <Input 
              placeholder={t('teams.enterTeamName')} 
              prefix={<TeamOutlined />}
              size="large"
            />
          </Form.Item>
          <Text type="secondary">
            💡 {t('teams.teamNameTip')}
          </Text>
        </Form>
      </Modal>

      {/* Join Team Modal */}
      <Modal
        title={
          <Space>
            <UsergroupAddOutlined />
            <span>{t('teams.joinExistingTeam')}</span>
          </Space>
        }
        open={joinVisible}
        onCancel={() => {
          setJoinVisible(false);
          joinForm.resetFields();
        }}
        onOk={() => joinForm.submit()}
        width={500}
        destroyOnHidden
      >
        <Form 
          form={joinForm} 
          onFinish={handleJoin}
          layout="vertical"
          style={{ marginTop: 16 }}
        >
          <Form.Item 
            name="teamId" 
            label={t('teams.teamId')}
            rules={[
              { required: true, message: t('teams.enterTeamId') }
            ]}
          >
            <Input 
              placeholder={t('teams.enterTeamId')} 
              prefix={<CopyOutlined />}
              size="large"
            />
          </Form.Item>
          <Text type="secondary">
            💡 {t('teams.teamIdTip')}
          </Text>
        </Form>
      </Modal>

      {/* Team Members Modal */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            <span>{t('teams.teamMembers')} ({selectedMembers.length})</span>
          </Space>
        }
        open={membersVisible}
        onCancel={() => setMembersVisible(false)}
        footer={[
          <Button key="invite" onClick={() => generateInviteLink(selectedTeam?.teamID)}>{t('teams.generateInviteLink')}</Button>,
          <Button key="close" onClick={() => setMembersVisible(false)}>{t('teams.close')}</Button>
        ]}
        width={600}
      >
        {selectedMembers.length === 0 ? (
          <Empty description={t('teams.noMembersInTeam')} />
        ) : (
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {selectedMembers.map((member, index) => (
              <Card 
                key={member._id} 
                size="small" 
                style={{ marginBottom: 8 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                
                <Row align="middle">
                  <Col span={10}>
                    <Avatar icon={<UserOutlined />} style={{ backgroundColor: getColor(index) }} />
                    <span style={{ marginLeft: 8, color: colors.text }}>{member.user.username || 'Unknown User'}</span>
                  </Col>
                  <Col span={8} style={{ textAlign: 'left' }}>
                    <div style={{ color: colors.text }}>{t('teams.role')}: {member.role === 'creator' ? t('teams.creator') : member.role === 'manager' ? t('teams.manager') : t('teams.member')}</div>
                  </Col>
                  <Col span={6} style={{ textAlign: 'right' }}>
                    {(requesterRole === 'creator' || requesterRole === 'manager') && member.role !== 'creator' && (
                      <Popconfirm
                        title={t('teams.removeMember')}
                        description={t('teams.removeMemberConfirmation')}
                        onConfirm={() => handleRemoveMember(selectedTeam._id, member.user._id)}
                        okText={t('teams.yes')}
                        cancelText={t('teams.no')}
                      >
                        <Button type="primary" danger size="small" icon={<DeleteOutlined />}>{t('teams.remove')}</Button>
                      </Popconfirm>
                    )}
                  </Col>
                </Row>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Team Settings Modal */}
      <Modal
        title={t('teams.teamSettingsFor', { teamName: selectedTeam?.name })}
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        footer={null}
        width={800}
      >
        <Tabs 
          defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: t('teams.membersManagement'),
              children: (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {selectedMembers.map((member, index) => (
                    <Card key={member._id} size="small" style={{ marginBottom: 8 }}>
                      <Row align="middle">
                        <Col span={6}>
                          <Avatar icon={<UserOutlined />} style={{ backgroundColor: getColor(index) }} />
                          <span style={{ marginLeft: 8 }}>{member.user.username}</span>
                        </Col>
                        <Col span={10} style={{ textAlign: 'left' }}>
                          <div style={{ marginRight: 8 }}>{t('teams.role')}: {member.role === 'creator' ? t('teams.creator') : member.role === 'manager' ? t('teams.manager') : t('teams.member')}</div>
                          {requesterRole === 'creator' && (
                            <Select
                              value={member.role}
                              onChange={(value) => handleRoleChange(selectedTeam._id, member.user._id, value)}
                              style={{ width: 120 }}
                            >
                              <Option value="creator">{t('teams.creator')}</Option>
                              <Option value="manager">{t('teams.manager')}</Option>
                              <Option value="member">{t('teams.member')}</Option>
                            </Select>
                          )}
                        </Col>
                        <Col span={6} style={{ textAlign: 'right' }}>
                          {(requesterRole === 'creator' || requesterRole === 'manager') && member.role !== 'creator' && (
                            <Popconfirm
                              title={t('teams.removeMember')}
                              onConfirm={() => handleRemoveMember(selectedTeam._id, member.user._id)}
                            >
                              <Button danger size="small" icon={<DeleteOutlined />}>{t('teams.remove')}</Button>
                            </Popconfirm>
                          )}
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              )
            },
            {
              key: '2',
              label: t('teams.permissionSettings'),
              children: (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {selectedMembers.map((member, index) => (
                    <Card key={member._id} size="small" style={{ marginBottom: 8 }}>
                      <Row align="middle">
                        <Col span={6}>
                          <Avatar icon={<UserOutlined />} style={{ backgroundColor: getColor(index) }} />
                          <span style={{ marginLeft: 8 }}>{member.user.username}</span>
                        </Col>
                        <Col span={18}>
                          {(requesterRole === 'creator' || (requesterRole === 'manager' && member.role === 'member')) && (
                            <Tree
                              checkable
                              treeData={permissionTreeData}
                              onCheck={(checkedKeys) => handlePermissionChange(selectedTeam._id, member.user._id, checkedKeys)}
                              checkedKeys={getCheckedPermissions(member.permissions)}
                            />
                          )}
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </div>
              )
            }
          ]}
        />
      </Modal>
    </motion.div>
  );
};

export default TeamList;