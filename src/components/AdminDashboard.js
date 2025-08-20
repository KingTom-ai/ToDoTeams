import React, { useState, useEffect } from 'react';
import { Table, Card, Typography, Space, Collapse, List } from 'antd';
import axios from '../utils/axiosConfig';
import { useThemeColors } from '../theme';
import { useTranslation } from 'react-i18next';

const { Title } = Typography;
const { Panel } = Collapse;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const colors = useThemeColors();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [usersRes, tasksRes, groupsRes, teamsRes] = await Promise.all([
          axios.get('/api/admin/users', { headers: { 'x-auth-token': token } }),
          axios.get('/api/admin/tasks', { headers: { 'x-auth-token': token } }),
          axios.get('/api/admin/groups', { headers: { 'x-auth-token': token } }),
          axios.get('/api/admin/teams', { headers: { 'x-auth-token': token } })
        ]);

        const usersWithData = usersRes.data.map(user => ({
          ...user,
          tasks: tasksRes.data.filter(t => t.creator === user._id),
          groups: groupsRes.data.filter(g => g.creator === user._id),
          teams: teamsRes.data.filter(tm => tm.creator === user._id)
        }));

        setUsers(usersWithData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const columns = [
    { title: t('admin.username'), dataIndex: 'username', key: 'username' },
    { title: t('admin.email'), dataIndex: 'email', key: 'email' },
    { title: t('admin.createdAt'), dataIndex: 'createdAt', key: 'createdAt', render: date => new Date(date).toLocaleDateString() },
    {
      title: t('admin.actions'),
      key: 'actions',
      render: (_, record) => (
        <Space>
          {/* Add simple actions like view details if needed */}
        </Space>
      )
    }
  ];

  const expandedRowRender = (record) => (
    <Collapse accordion>
      <Panel header={t('admin.tasks')} key="1">
        <List dataSource={record.tasks} renderItem={item => <List.Item>{item.title}</List.Item>} />
      </Panel>
      <Panel header={t('admin.groups')} key="2">
        <List dataSource={record.groups} renderItem={item => <List.Item>{item.name}</List.Item>} />
      </Panel>
      <Panel header={t('admin.teams')} key="3">
        <List dataSource={record.teams} renderItem={item => <List.Item>{item.name}</List.Item>} />
      </Panel>
    </Collapse>
  );

  return (
    <Card style={{ margin: 24, background: colors.cardBackground }}>
      <Title level={2}>{t('admin.adminDashboard')}</Title>
      <Table 
        columns={columns} 
        dataSource={users} 
        rowKey="_id" 
        loading={loading} 
        expandable={{ expandedRowRender }} 
      />
    </Card>
  );
};

export default AdminDashboard;