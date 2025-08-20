import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { updateTaskAsync, updateTeamTask } from '../reducers/tasks';
import { selectTeamGroups } from '../reducers/teamgroups';
import { 
  Card, 
  Typography, 
  Tag, 
  Button, 
  Space, 
  Divider,
  Row,
  Col,
  Avatar,
  Timeline,
  Progress,
  List,
  Form,
  Input,
  message,
  Select,
  Modal
} from 'antd';
import { 
  ArrowLeftOutlined,
  EditOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  FlagOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileWordOutlined,
  FileExcelOutlined,
  FilePptOutlined,
  FileOutlined
} from '@ant-design/icons';

import { motion } from 'framer-motion';
import moment from 'moment';
import axios from '../utils/axiosConfig'; // 使用配置了拦截器的axios
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { UploadOutlined, DownloadOutlined, DeleteOutlined, MenuOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useThemeColors } from '../theme';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const TaskDetail = () => {
  const { t } = useTranslation();
  const [messageApi, contextHolder] = message.useMessage();
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const task = useSelector(state => state.tasks.tasks.find(t => t._id === id));
  
  /**
   * 处理返回按钮点击事件
   * 根据任务类型和分组信息返回到正确的页面
   */
  const handleBackToTasks = () => {
    if (!task) {
      navigate('/tasks');
      return;
    }
    
    // 构建返回URL，包含当前任务的分组信息
    let backUrl = '/tasks';
    
    if (task.teamId) {
      // 团队任务：返回到团队任务页面的对应分组
      const teamGroup = task.teamGroup || 'ungrouped';
      backUrl = `/teams/${task.teamId._id || task.teamId}/tasks?group=${teamGroup}`;
    } else {
      // 个人任务：返回到个人任务页面的对应分组
      const group = task.group || 'ungrouped';
      backUrl = `/tasks?group=${group}`;
    }
    
    navigate(backUrl);
  };
  const [timeRemaining, setTimeRemaining] = useState('');
  const [comments, setComments] = useState([]);
  const [commentForm] = Form.useForm();
  const [steps, setSteps] = useState([]);
  const [stepForm] = Form.useForm();
  const [attachments, setAttachments] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef();
  const [group, setGroup] = useState(task?.group || 'ungrouped');
  const [editingStepId, setEditingStepId] = useState(null);
  const [editedText, setEditedText] = useState('');

  // 从Redux store获取组数据
  const teamGroups = useSelector(selectTeamGroups(task?.teamId?._id || task?.teamId)) || [];
  const personalGroups = useSelector(state => state.groups?.groups || []);
  const availableGroups = task?.teamId ? teamGroups : personalGroups;

  // 当task变化时更新group状态
  useEffect(() => {
    if (task) {
      // 根据任务类型设置正确的分组值
      const groupValue = task.teamId ? (task.teamGroup || 'ungrouped') : (task.group || 'ungrouped');
      setGroup(groupValue);
    }
  }, [task]);

  /**
   * 处理分组变更并更新后端
   * 根据任务类型选择正确的字段名，并重新获取任务数据
   */
  const handleGroupChange = async (value) => {
    setGroup(value);
    try {
      // 根据任务类型使用正确的字段名
      const updateData = task.teamId ? { teamGroup: value } : { group: value };
      const response = await axios.put(`/api/tasks/${id}`, updateData);
      
      // 更新Redux store中的任务数据
      if (task.teamId) {
        dispatch(updateTeamTask({ taskId: id, updates: response.data }));
      } else {
        dispatch(updateTaskAsync({ taskId: id, updates: response.data }));
      }
      
      messageApi.success('分组更新成功');
    } catch (err) {
      messageApi.error('更新分组失败');
      console.error('Group update error:', err);
    }
  };

  // 函数级注释：生成分组选项列表
  // 递归生成所有可用的分组选项
  const generateGroupOptions = () => {
    const options = [];
    options.push(
      <Option key="ungrouped" value="ungrouped">
        {t('tasks.ungrouped')}
      </Option>
    );
  
    const addGroupOptions = (groups, level = 0) => {
      groups.forEach(group => {
        if (!group.id || !group.name) return;
        const prefix = '  '.repeat(level);
        const icon = group.children && group.children.length > 0 ? '📁 ' : '📄 ';
        options.push(
          <Option key={group.id} value={group.id}>
            {prefix}{icon}{group.name}
          </Option>
        );
        if (group.children && group.children.length > 0) {
          addGroupOptions(group.children, level + 1);
        }
      });
    };
    
    addGroupOptions(availableGroups);
    return options;
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        navigate('/tasks');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  useEffect(() => {
    if (task?.dueDate) {
      const updateTimeRemaining = () => {
        const now = moment();
        const due = moment(task.dueDate);
        const diff = due.diff(now);
        
        if (diff > 0) {
          const duration = moment.duration(diff);
          const days = Math.floor(duration.asDays());
          const hours = duration.hours();
          const minutes = duration.minutes();
          
          if (days > 0) {
            setTimeRemaining(t('tasks.timeRemaining.daysHours', { days, hours }));
          } else if (hours > 0) {
            setTimeRemaining(t('tasks.timeRemaining.hoursMinutes', { hours, minutes }));
          } else {
            setTimeRemaining(t('tasks.timeRemaining.minutes', { minutes }));
          }
        } else {
          setTimeRemaining(t('tasks.overdue'));
        }
      };
      
      updateTimeRemaining();
      const interval = setInterval(updateTimeRemaining, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [task?.dueDate]);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/tasks/${id}/comments`, { headers: { 'x-auth-token': token } });
        setComments(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchComments();
  }, [id]);

  useEffect(() => {
    const fetchSteps = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/tasks/${id}/steps`, { headers: { 'x-auth-token': token } });
        setSteps(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSteps();
  }, [id]);

  useEffect(() => {
    const fetchAttachments = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/tasks/${id}/attachments`, { headers: { 'x-auth-token': token } });
        setAttachments(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAttachments();
  }, [id]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      const res = await axios.post(`/api/tasks/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAttachments(res.data);
      setSelectedFile(null);
      fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownload = async (attachmentId, filename) => {
    try {
      const res = await axios.get(`/api/tasks/${id}/attachments/${attachmentId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (attachmentId) => {
    try {
      const res = await axios.delete(`/api/tasks/${id}/attachments/${attachmentId}`);
      setAttachments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const addStep = async (values) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/tasks/${id}/steps`, { text: values.text }, { headers: { 'x-auth-token': token } });
      setSteps(res.data);
      stepForm.resetFields();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (stepId, text) => {
    setEditingStepId(stepId);
    setEditedText(text);
  };

  const editStep = async (stepId) => {
    if (!editedText.trim()) {
      setEditingStepId(null);
      return messageApi.error(t('tasks.stepTextRequired'));
    }
    try {
      const res = await axios.put(`/api/tasks/${id}/steps/${stepId}/text`, { text: editedText });
      setSteps(res.data);
      setEditingStepId(null);
      messageApi.success(t('tasks.stepUpdated'));
    } catch (err) {
      console.error('Error:', err.response ? err.response.data : err.message);
      messageApi.error(t('tasks.failedUpdateStep'));
    }
  };

  const deleteStep = (stepId) => {
    Modal.confirm({
      title: t('tasks.confirmDelete'),
      content: t('tasks.confirmDeleteStep'),
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await axios.delete(`/api/tasks/${id}/steps/${stepId}`, { headers: { 'x-auth-token': token } });
          setSteps(res.data);
          messageApi.success(t('tasks.stepDeleted'));
        } catch (err) {
          console.error('Error:', err.response ? err.response.data : err.message);
          messageApi.error(t('tasks.failedDeleteStep'));
        }
      }
    });
  };

  const toggleStep = async (stepId, completed) => {
    try {
      const res = await axios.put(`/api/tasks/${id}/steps/${stepId}`, { completed });
      setSteps(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(steps);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    
    setSteps(items);
    
    try {
      const token = localStorage.getItem('token');
      const orderedStepIds = items.map(item => item._id);
      await axios.put(`/api/tasks/${id}/steps/reorder`, { orderedStepIds }, { headers: { 'x-auth-token': token } });
    } catch (err) {
      console.error('Reorder error:', err);
      messageApi.error(t('tasks.failedReorderSteps'));
    }
  };

  const colors = useThemeColors();

  /**
   * 截断文件名函数
   * 限制文件名显示长度，保留文件扩展名
   */
  const truncateFilename = (filename, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split('.').pop();
    const name = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = name.substring(0, maxLength - ext.length - 4) + '...';
    return `${truncatedName}.${ext}`;
  };

  /**
   * 根据文件扩展名获取对应的文件图标
   * 支持常见的文件类型图标显示
   */
  const getFileIcon = (filename) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf': return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp': return <FileImageOutlined style={{ color: '#52c41a' }} />;
      case 'doc':
      case 'docx': return <FileWordOutlined style={{ color: '#1890ff' }} />;
      case 'xls':
      case 'xlsx': return <FileExcelOutlined style={{ color: '#52c41a' }} />;
      case 'ppt':
      case 'pptx': return <FilePptOutlined style={{ color: '#fa8c16' }} />;
      default: return <FileOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return colors.highPriority;
      case 'medium': return colors.mediumPriority;
      case 'low': return colors.lowPriority;
      default: return colors.defaultColor;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return colors.completedStatus;
      case 'in-progress': return colors.inProgressStatus;
      case 'pending': return colors.pendingStatus;
      default: return colors.defaultColor;
    }
  };

  const getProgressPercent = () => {
    if (!steps || steps.length === 0) {
      // 如果没有步骤，则根据任务状态计算进度
      switch (task.status) {
        case 'completed': return 100;
        case 'in-progress': return 50;
        case 'pending': return 0;
        default: return 0;
      }
    }
    
    // 基于已完成步骤数量计算进度
    const completedSteps = steps.filter(step => step.completed).length;
    const totalSteps = steps.length;
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  };

  if (!task) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="fade-in"
        style={{ padding: 24, textAlign: 'center' }}
      >
        <Card>
          <Title level={3}>{t('tasks.taskNotFound')}</Title>
          <Button type="primary" onClick={handleBackToTasks}>
            {t('tasks.backToTasks')}
          </Button>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: 100 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -100 }} 
      transition={{ duration: 0.3 }}
      style={{ padding: '0 24px 24px 24px' }}
    >
      {contextHolder}
      {/* Header */}
      <Card className="task-card" style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBackToTasks}
                type="text"
              >
                {t('tasks.backToTasks')}
              </Button>
              <Divider type="vertical" />
              <Title level={2} style={{ margin: 0 }}>{task.title}</Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => navigate('/tasks', { state: { editTaskId: id } })}
              >
                {t('tasks.editTask')}
              </Button>
            </Space>
          </Col>
        </Row>
        
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Space size="large">
              <Tag color={getPriorityColor(task.priority)}>
                <FlagOutlined /> {task.priority?.toUpperCase() || 'MEDIUM'}
              </Tag>
              <Tag color={getStatusColor(task.status)}>
                {task.status === 'completed' && <CheckCircleOutlined />}
                {task.status === 'in-progress' && <ClockCircleOutlined />}
                {task.status === 'pending' && <ExclamationCircleOutlined />}
                {task.status?.toUpperCase() || 'PENDING'}
              </Tag>
              <Progress 
                percent={getProgressPercent()} 
                size="small" 
                style={{ width: 200 }}
                strokeColor={getStatusColor(task.status)}
              />
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={24}>
        {/* Main Content */}
        <Col xs={24} lg={16}>
          {/* Task Description */}
          <Card className="task-card" style={{ marginBottom: 24 }}>
            <Title level={4}>{t('tasks.description')}</Title>
            <Paragraph>
              {task.description || t('tasks.noDescription')}
            </Paragraph>
          </Card>

          {/* Comments Section */}
          <Card className="task-card" title={t('tasks.comments')} style={{ marginBottom: 24 }}>
            <div style={{
              maxHeight: comments.length > 6 ? '1280px' : 'none',
              overflowY: comments.length > 6 ? 'auto' : 'visible',
              marginBottom: '16px',
              border: comments.length > 6 ? '1px solid #f0f0f0' : 'none',
              borderRadius: comments.length > 6 ? '6px' : '0',
              padding: comments.length > 6 ? '8px' : '0'
            }}>
              <List
                dataSource={comments}
                renderItem={item => (
                  <List.Item key={item._id} style={{ padding: '12px 0' }}>
                    <div>
                      <Text strong>{item.userId.username}</Text>
                      <br />
                      <Text>{item.text}</Text>
                      <br />
                      <Text type="secondary">{moment(item.createdAt).format('MMM DD, YYYY HH:mm')}</Text>
                    </div>
                  </List.Item>
                )}
              />
            </div>
            <Form form={commentForm} onFinish={async (values) => {
              try {
                const token = localStorage.getItem('token');
                const res = await axios.post(`/api/tasks/${id}/comments`, { text: values.text }, { headers: { 'x-auth-token': token } });
                setComments(res.data);
                commentForm.resetFields();
              } catch (err) {
                console.error(err);
              }
            }}>
              <Form.Item name="text" rules={[{ required: true, message: t('tasks.enterComment') }]}>
                <Input.TextArea placeholder={t('tasks.addComment')} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">{t('tasks.addComment')}</Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Sidebar */}
        <Col xs={24} lg={8}>
          {/* Task Steps */}
          <Card title={t('tasks.taskSteps')} className="task-card" style={{ marginBottom: 24 }}>
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="steps">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} style={{ maxHeight: '450px', overflowY: 'auto' }}>
                    <List
                      dataSource={steps}
                      renderItem={(item, index) => (
                        <Draggable key={item._id.toString()} draggableId={item._id.toString()} index={index}>
                          {(provided) => (
                            <List.Item
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{ cursor: 'default' }}
                            >
                              <MenuOutlined style={{ cursor: 'grab', marginRight: 8 }} {...provided.dragHandleProps} />
                              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                                <Space>
                                  <span onClick={() => toggleStep(item._id, !item.completed)}>
                                    {item.completed ? <CheckCircleOutlined style={{ color: 'green' }} /> : <ClockCircleOutlined />}
                                  </span>
                                  {editingStepId === item._id ? (
                                    <Input
                                      value={editedText}
                                      onChange={(e) => setEditedText(e.target.value)}
                                      onPressEnter={() => editStep(item._id)}
                                      onBlur={() => editStep(item._id)}
                                    />
                                  ) : (
                                    <Text delete={item.completed} style={{ userSelect: 'none' }}>{item.text}</Text>
                                  )}
                                </Space>
                                <Space>
                                  <Button icon={<EditOutlined />} size="small" onClick={() => startEditing(item._id, item.text)} />
                                  <Button icon={<DeleteOutlined />} size="small" danger onClick={() => deleteStep(item._id)} />
                                </Space>
                              </Space>
                            </List.Item>
                          )}
                        </Draggable>
                      )}
                    />
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <Form form={stepForm} onFinish={addStep}>
              <Form.Item name="text" rules={[{ required: true, message: t('tasks.enterStep') }]}>
                <Input placeholder={t('tasks.addStep')} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">{t('tasks.addStep')}</Button>
              </Form.Item>
            </Form>
          </Card>
          
          {/* Task Timeline */}
          <Card className="task-card" title={t('tasks.taskTimeline')} style={{ marginBottom: 24 }}>
            <Timeline
              items={
                [
                  {
                    dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                    color: task.status === 'completed' ? 'green' : 'gray',
                    children: (
                      <div>
                        <Text strong>{t('tasks.taskCreated')}</Text>
                        <br />
                        <Text type="secondary">
                          {moment(task.createdAt).format('MMM DD, YYYY HH:mm')}
                        </Text>
                      </div>
                    )
                  },
                  ...(task.status === 'in-progress' ? [{
                    dot: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
                    color: 'blue',
                    children: (
                      <div>
                        <Text strong>{t('tasks.inProgress')}</Text>
                        <br />
                        <Text type="secondary">{t('tasks.currentlyWorking')}</Text>
                      </div>
                    )
                  }] : []),
                  ...(task.status === 'completed' ? [{
                    dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                    color: 'green',
                    children: (
                      <div>
                        <Text strong>{t('tasks.taskCompleted')}</Text>
                        <br />
                        <Text type="secondary">
                          {moment(task.updatedAt).format('MMM DD, YYYY HH:mm')}
                        </Text>
                      </div>
                    )
                  }] : [])
                ]
              }
            />
          </Card>

          {/* User Assignment */}
          <Card className="task-card" title={t('tasks.userAssignment')} style={{ marginBottom: 24 }}>
            <Row align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 12 }} />
                <Text strong>{t('tasks.assignedTo')}: </Text>
                <Text>{t('tasks.you')}</Text>
              </Col>
            </Row>

            <Row align="middle">
              <Col>
                <Avatar icon={<UserOutlined />} style={{ marginRight: 12 }} />
                <Text strong>{t('tasks.createdBy')}: </Text>
                <Text>{t('tasks.you')}</Text>
              </Col>
            </Row>
          </Card>

          {/* Attachments */}
          <Card title={t('tasks.attachments')} className="task-card" style={{ marginBottom: 24 }}>
            <List
              dataSource={attachments}
              renderItem={item => (
                <List.Item key={item._id} style={{ padding: '8px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                      {getFileIcon(item.filename)}
                      <div style={{ marginLeft: 8, flex: 1, minWidth: 0 }}>
                        <Tooltip title={item.filename}>
                          <Text style={{ 
                            display: 'block',
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                          }}>
                            {truncateFilename(item.filename)}
                          </Text>
                        </Tooltip>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button 
                        icon={<DownloadOutlined />} 
                        onClick={() => handleDownload(item._id, item.filename)}
                        size="small"
                        type="text"
                      />
                      <Button 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => handleDelete(item._id)}
                        size="small"
                        type="text"
                      />
                    </div>
                  </div>
                </List.Item>
              )}
            />
            <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
            <Button 
              icon={<UploadOutlined />} 
              onClick={() => fileInputRef.current.click()}
            >
              {t('tasks.selectFile')}
            </Button>
            {selectedFile && <Text style={{ marginLeft: 8 }}>{selectedFile.name}</Text>}
            <Button onClick={handleUpload} style={{ marginLeft: 8 }} disabled={!selectedFile}>{t('tasks.upload')}</Button>
          </Card>
          
          {/* Task Details */}
          <Card title={t('tasks.taskDetails')} className="task-card" style={{ marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>{t('tasks.priority')}: </Text>
                <Tag color={getPriorityColor(task.priority)}>
                  {task.priority?.toUpperCase() || 'MEDIUM'}
                </Tag>
              </div>
              
              <div>
                <Text strong>{t('tasks.status')}: </Text>
                <Tag color={getStatusColor(task.status)}>
                  {task.status?.toUpperCase() || 'PENDING'}
                </Tag>
              </div>
              
              <div>
                <Text strong>{t('tasks.dueDate')}: </Text>
                {task.dueDate ? (
                  <div>
                    <Text>{moment(task.dueDate).format('MMM DD, YYYY')}</Text>
                    <br />
                    <Tag 
                      color={timeRemaining === 'Overdue' ? 'red' : 'blue'} 
                      type={timeRemaining === 'Overdue' ? 'danger' : 'secondary'}
                      style={{ fontSize: '12px' }}
                    >
                      {timeRemaining}
                    </Tag>
                  </div>
                ) : (
                  <Text type="secondary">{t('tasks.noDueDate')}</Text>
                )}
              </div>
              
              <div>
                <Text strong>{t('tasks.created')}: </Text>
                <Text type="secondary">
                  {moment(task.createdAt).format('MMM DD, YYYY')}
                </Text>
              </div>
              
              <div>
                <Text strong>{t('tasks.lastUpdated')}: </Text>
                <Text type="secondary">
                  {moment(task.updatedAt).fromNow()}
                </Text>
              </div>
              <div>
                <Text strong>{t('tasks.group')}: </Text>
                <Select value={group || 'ungrouped'} onChange={handleGroupChange} style={{ width: 200 }}>
                  {generateGroupOptions()}
                </Select>
              </div>
            </Space>
          </Card>


        </Col>
      </Row>
    </motion.div>
  );
};

export default TaskDetail;
