import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { List, Typography, theme } from 'antd';
import axios from '../utils/axiosConfig';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const { useToken } = theme;

// 函数级注释：团队消息列表组件，用于显示团队内的通知消息
const MessageList = () => {
  const { t } = useTranslation();
  const { teamId } = useParams();
  const dispatch = useDispatch();
  const [messages, setMessages] = useState([]);
  const { token } = useToken();

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${teamId}`);
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    if (teamId) fetchMessages();
  }, [teamId]);

  return (
    <div style={{ padding: token.padding, background: token.colorBgContainer }}>
      <Text strong>{t('messages.teamMessages')}</Text>
      <List
        dataSource={messages}
        renderItem={msg => (
          <List.Item>
            <Text>{msg.content} ({new Date(msg.createdAt).toLocaleString()})</Text>
          </List.Item>
        )}
      />
    </div>
  );
};

export default MessageList;