import React, { useEffect, useState } from 'react';
import { List, Typography, Card, Space, Tag, Avatar, Empty, Spin } from 'antd';
import { UserOutlined, TeamOutlined, BellOutlined } from '@ant-design/icons';
import axios from '../utils/axiosConfig';
import { motion } from 'framer-motion';
import { useThemeColors } from '../theme';
import { App as AntApp } from 'antd';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

/**
 * 消息中心组件，显示用户所有团队的消息
 */
const MessageCenter = () => {
  const { t } = useTranslation();
  const { message } = AntApp.useApp();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const colors = useThemeColors();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found, user not logged in');
          setMessages([]);
          return;
        }
        
        const response = await axios.get('/api/messages');
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        console.error('Error details:', error.response ? error.response.data : error.message);
        
        if (error.response && error.response.status === 401) {
          console.log('Authentication failed, redirecting to login');
          setMessages([]);
        } else {
          message.error(t('messages.fetchFailed'));
          setMessages([
            {
              _id: '1',
              teamId: 'test-team-1',
              eventType: 'member_join',
              content: t('messages.mockData.memberJoin'),
              createdAt: new Date().toISOString()
            },
            {
              _id: '2',
              teamId: 'test-team-1',
              eventType: 'role_change',
              content: t('messages.mockData.roleChange'),
              createdAt: new Date(Date.now() - 3600000).toISOString()
            },
            {
              _id: '3',
              teamId: 'test-team-2',
              eventType: 'task_assign',
              content: t('messages.mockData.taskAssign'),
              createdAt: new Date(Date.now() - 7200000).toISOString()
            }
          ]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchMessages();
  }, [message]);

  // 获取消息类型对应的标签颜色和图标
  const getMessageTypeInfo = (eventType) => {
    switch (eventType) {
      case 'member_join':
        return { color: 'green', icon: <UserOutlined />, text: t('messages.types.memberJoin') };
      case 'member_leave':
        return { color: 'orange', icon: <UserOutlined />, text: t('messages.types.memberLeave') };
      case 'member_removed':
        return { color: 'red', icon: <UserOutlined />, text: t('messages.types.memberRemoved') };
      case 'role_change':
        return { color: 'blue', icon: <UserOutlined />, text: t('messages.types.roleChange') };
      case 'role_promoted':
        return { color: 'cyan', icon: <UserOutlined />, text: t('messages.types.rolePromoted') };
      case 'role_demoted':
        return { color: 'volcano', icon: <UserOutlined />, text: t('messages.types.roleDemoted') };
      case 'permission_granted':
        return { color: 'lime', icon: <UserOutlined />, text: t('messages.types.permissionGranted') };
      case 'permission_revoked':
        return { color: 'magenta', icon: <UserOutlined />, text: t('messages.types.permissionRevoked') };
      case 'team_created':
        return { color: 'green', icon: <TeamOutlined />, text: t('messages.types.teamCreated') };
      case 'team_deleted':
        return { color: 'red', icon: <TeamOutlined />, text: t('messages.types.teamDeleted') };
      case 'team_updated':
        return { color: 'blue', icon: <TeamOutlined />, text: t('messages.types.teamUpdated') };
      case 'task_assigned':
        return { color: 'purple', icon: <BellOutlined />, text: t('messages.types.taskAssigned') };
      case 'task_completed':
        return { color: 'green', icon: <BellOutlined />, text: t('messages.types.taskCompleted') };
      case 'task_overdue':
        return { color: 'red', icon: <BellOutlined />, text: t('messages.types.taskOverdue') };
      case 'mention':
        return { color: 'orange', icon: <BellOutlined />, text: t('messages.types.mention') };
      case 'audit_log':
        return { color: 'geekblue', icon: <BellOutlined />, text: t('messages.types.auditLog') };
      case 'security_alert':
        return { color: 'red', icon: <BellOutlined />, text: t('messages.types.securityAlert') };
      // 兼容旧的事件类型
      case 'member_remove':
        return { color: 'red', icon: <UserOutlined />, text: t('messages.types.memberRemoved') };
      case 'team_delete':
        return { color: 'red', icon: <TeamOutlined />, text: t('messages.types.teamDeleted') };
      case 'task_assign':
        return { color: 'purple', icon: <BellOutlined />, text: t('messages.types.taskAssigned') };
      default:
        return { color: 'default', icon: <BellOutlined />, text: t('messages.types.notification') };
    }
  };

  /**
   * 处理消息点击事件，标记消息为已读并更新状态
   * @param {string} messageId - 消息ID
   */
  const handleMessageClick = async (messageId) => {
    try {
      await axios.patch(`/api/messages/${messageId}/read`);
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg._id === messageId ? { ...msg, isRead: true } : msg
        )
      );
      window.dispatchEvent(new CustomEvent('unreadUpdated'));
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      style={{ padding: '0 24px 24px 24px' }}
    >
      <Card className="task-card" style={{ marginBottom: 24 }}>
        <Title level={3}>
          <BellOutlined /> {t('messages.title')}
        </Title>
      </Card>

      <Card className="task-card">
        <Spin spinning={loading}>
          {messages.length === 0 ? (
            <Empty description={t('messages.noMessages')} />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={messages}
              renderItem={(msg) => {
                const typeInfo = getMessageTypeInfo(msg.eventType);
                const isUnread = !msg.isRead;
                return (
                  <List.Item onClick={() => handleMessageClick(msg._id)} style={{ cursor: 'pointer' }}>
                    <List.Item.Meta
                      avatar={<Avatar icon={typeInfo.icon} style={{ backgroundColor: colors.avatarColors[0] }} />}
                      title={
                        <Space>
                          <Tag color={typeInfo.color}>{typeInfo.text}</Tag>
                          <Text strong={isUnread}>{msg.content}</Text>
                        </Space>
                      }
                      description={
                        <Space>
                          <Text type="secondary">{t('messages.teamId')}: {msg.teamId}</Text>
                          <Text type="secondary">{new Date(msg.createdAt).toLocaleString()}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total) => t('messages.totalMessages', { total }),
              }}
            />
          )}
        </Spin>
      </Card>
    </motion.div>
  );
};

export default MessageCenter;