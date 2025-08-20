import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  Card,
  Tag,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Input,
  Select,
  Modal,
  Form,
  DatePicker,
  App,
  Tooltip,
  Popconfirm,
  Empty,
  Badge
} from 'antd';
import { 
  PlusOutlined, 
  SearchOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  CalendarOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  FlagOutlined,
  EyeOutlined,
  ShareAltOutlined
} from '@ant-design/icons';

import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';
import { fetchGroups, initializeGroups, selectGroups } from '../reducers/groups';
import { fetchTeamGroups, selectTeamGroups } from '../reducers/teamgroups';
import { fetchTasks, fetchTeamTasks, createTask, createTeamTask, updateTaskAsync, updateTeamTask, deleteTaskAsync, deleteTeamTask, selectTasksState } from '../reducers/tasks';
import { fetchTeams } from '../reducers/teams';
import { useThemeColors } from '../theme';

// 设置moment默认locale为中文
const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;

const TaskList = ({ currentGroup: propCurrentGroup }) => {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const { teamId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const themeColors = useThemeColors();
  
  // 从URL查询参数中获取group和team值
  const urlParams = new URLSearchParams(location.search);
  const groupFromUrl = urlParams.get('group');
  const teamFromUrl = urlParams.get('team');
  const effectiveTeamId = teamId || teamFromUrl;
  const currentGroup = propCurrentGroup || groupFromUrl || (effectiveTeamId ? 'ungrouped' : 'all');
  
  const groups = useSelector(selectGroups);
  const teamgroupsState = useSelector(selectTeamGroups(effectiveTeamId));
  const teams = useSelector(state => state.teams.teams);
  const availableGroups = effectiveTeamId ? teamgroupsState : groups;
  const { tasks, loading } = useSelector(selectTasksState);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form] = Form.useForm();
  
  // 任务分配相关状态
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [assigningTask, setAssigningTask] = useState(null);
  const [assignForm] = Form.useForm();
  const [targetTeamGroups, setTargetTeamGroups] = useState([]);

  useEffect(() => {
    if (effectiveTeamId) {
      // 确保先获取团队组数据，再获取任务数据
      const loadTeamData = async () => {
        try {
          await dispatch(fetchTeamGroups(effectiveTeamId)).unwrap();
          await dispatch(fetchTeamTasks(effectiveTeamId)).unwrap();
        } catch (error) {
          console.error('Failed to load team data:', error);
        }
      };
      loadTeamData();
    } else {
      dispatch(fetchTasks());
      dispatch(fetchGroups());
    }
  }, [dispatch, effectiveTeamId]);

  // 获取teams数据
  useEffect(() => {
    if (effectiveTeamId && teams.length === 0) {
      dispatch(fetchTeams());
    }
  }, [dispatch, effectiveTeamId, teams.length]);

  // 监听teams状态变化，确保创建/删除团队后任务列表自动刷新
  useEffect(() => {
    if (effectiveTeamId) {
      // 当teams状态发生变化时，重新获取团队任务数据
      dispatch(fetchTeamTasks(effectiveTeamId));
    }
  }, [dispatch, effectiveTeamId, teams]);

  /**
   * 处理任务创建的函数
   * @param {Object} values - 表单值
   */
  const handleCreateTask = async (values) => {
    try {
      // 根据是否在团队环境下创建不同的任务数据结构
      const taskData = {
        ...values,
        dueDate: values.dueDate ? dayjs(values.dueDate).toISOString() : null
      };
      
      if (effectiveTeamId) {
        // 团队任务：包含teamId和teamGroup
        taskData.teamId = effectiveTeamId;
        taskData.teamGroup = values.group;
      } else {
        // 个人任务：只包含group，不包含teamId
        taskData.group = values.group;
      }
      
      if (effectiveTeamId) {
        await dispatch(createTeamTask(taskData)).unwrap();
      } else {
        await dispatch(createTask(taskData)).unwrap();
      }
      
      message.success(t('tasks.taskCreatedSuccess'));
      setIsModalVisible(false);
      form.resetFields();
      
      // Redux会自动更新任务列表，不需要手动刷新
    } catch (error) {
      console.error('Task creation error:', error);
      message.error(t('tasks.taskCreatedFailed'));
    }
  };

  /**
   * 处理任务分配的函数
   * @param {Object} task - 要分配的任务对象
   */
  const handleAssignTask = (task) => {
    setAssigningTask(task);
    setIsAssignModalVisible(true);
    assignForm.resetFields();
    setTargetTeamGroups([]); // 重置目标团队组数据
  };

  /**
   * 获取目标团队的组数据
   * @param {string} teamId - 团队ID
   */
  const fetchTargetTeamGroups = async (teamId) => {
    try {
      const result = await dispatch(fetchTeamGroups(teamId)).unwrap();
      setTargetTeamGroups(result || []);
    } catch (error) {
      console.error('Failed to fetch target team groups:', error);
      setTargetTeamGroups([]);
    }
  };

  /**
   * 执行任务分配的函数
   * @param {Object} values - 分配表单的值
   */
  const handleTaskAssignment = async (values) => {
    try {
      const { targetType, targetTeam, targetGroup } = values;
      
      // 创建任务副本数据
      const taskCopy = {
        title: assigningTask.title,
        description: assigningTask.description,
        priority: assigningTask.priority,
        status: assigningTask.status,
        dueDate: assigningTask.dueDate,
        originalTaskId: assigningTask._id, // 记录原始任务ID用于数据同步
        isShared: true // 标记为共享任务
      };

      if (targetType === 'team') {
        // 分配到团队
        taskCopy.teamId = targetTeam;
        taskCopy.teamGroup = targetGroup;
        await dispatch(createTeamTask(taskCopy)).unwrap();
      } else {
        // 分配到个人任务
        taskCopy.group = targetGroup;
        await dispatch(createTask(taskCopy)).unwrap();
      }

      message.success(t('tasks.taskAssignedSuccess'));
      setIsAssignModalVisible(false);
      assignForm.resetFields();
      setAssigningTask(null);
      setTargetTeamGroups([]);
    } catch (error) {
      console.error('Task assignment error:', error);
      message.error(t('tasks.taskAssignedFailed'));
    }
  };

  // 类似地调整handleUpdateTask如果需要

  // 调整generateGroupOptions
  const generateGroupOptions = () => {
    const options = [];
    availableGroups.forEach(group => {
      if (!group.parentId) {
        options.push(<Option key={group.id} value={group.id}>{group.name}</Option>);
        group.children?.forEach(child => {
          options.push(<Option key={child.id} value={child.id}>{`  - ${child.name}`}</Option>);
        });
      }
    });
    options.push(<Option key="ungrouped" value="ungrouped">{t('tasks.ungrouped')}</Option>);
    return options;
  };

  // 调整过滤逻辑如果需要
  const findGroupName = (groupId) => {
    const findInGroups = (groups) => {
      for (const group of groups) {
        if (group.id === groupId) {
          return group.name;
        }
        if (group.children) {
          const found = findInGroups(group.children);
          if (found) return found;
        }
      }
      return null;
    };
    
    return findInGroups(availableGroups) || t('tasks.ungrouped');
  };

    // 初始化个人任务的组数据（仅在非团队环境下）
  useEffect(() => {
    if (!effectiveTeamId) {
      const initializeData = async () => {
        const token = localStorage.getItem('token');
        if (token) {
          // 确保组数据已加载
          if (availableGroups.length === 0) {
            try {
              await dispatch(fetchGroups()).unwrap();
            } catch (error) {
              // 如果获取失败，初始化默认组
              await dispatch(initializeGroups()).unwrap();
            }
          }
        }
      };
      
      initializeData();
    }
  }, [dispatch, effectiveTeamId, availableGroups.length]);
  
  // 获取个人任务数据（仅在非团队环境下且组数据已加载）
  useEffect(() => {
    if (!effectiveTeamId && availableGroups.length > 0) {
      dispatch(fetchTasks());
    }
  }, [dispatch, effectiveTeamId, availableGroups.length]);

    // Check if we should open edit modal from navigation state
    useEffect(() => {
      if (location.state?.editTaskId) {
        const taskToEdit = tasks.find(t => t._id === location.state.editTaskId);
        if (taskToEdit) {
          setEditingTask(taskToEdit);
          setIsModalVisible(true);
          form.setFieldsValue({
  ...taskToEdit,
  dueDate: taskToEdit.dueDate ? dayjs(taskToEdit.dueDate) : null
});
          // Clear the navigation state
          navigate(location.pathname + location.search, { replace: true });
        }
      }
    }, [location.state, tasks, form, navigate, location.pathname, location.search]);



    /**
     * 函数级注释：检查组是否为子组
     * @param {string} groupId - 组ID
     * @param {Array} groups - 组数据
     * @returns {boolean} 是否为子组
     */
    const isSubgroup = (groupId, groups) => {
      // 递归检查所有组的children中是否包含目标groupId
      const checkInChildren = (groupList) => {
        for (const group of groupList) {
          if (group.children && group.children.length > 0) {
            // 检查直接子组
            for (const child of group.children) {
              if (child.id === groupId) {
                
                return true;
              }
            }
            // 递归检查更深层的子组
            if (checkInChildren(group.children)) {
              return true;
            }
          }
        }
        return false;
      };
      
      const result = checkInChildren(groups);
      
      return result;
    };

    /**
     * 函数级注释：获取所有子组ID（包括嵌套子组）
     * @param {string} parentGroupId - 父组ID
     * @param {Array} groups - 组数据
     * @returns {Array} 所有子组ID数组
     */
    const getAllSubgroupIds = (parentGroupId, groups) => {
      const subgroupIds = [];
      
      const findAndCollectSubgroups = (groupList) => {
        for (const group of groupList) {
          if (group.id === parentGroupId && group.children) {
            const collectIds = (children) => {
              for (const child of children) {
                subgroupIds.push(child.id);
                if (child.children && child.children.length > 0) {
                  collectIds(child.children);
                }
              }
            };
            collectIds(group.children);
            return true;
          }
          if (group.children && findAndCollectSubgroups(group.children)) {
            return true;
          }
        }
        return false;
      };
      
      findAndCollectSubgroups(groups);
      return subgroupIds;
    };

    const filteredTasks = useMemo(() => {
      return tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchText.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchText.toLowerCase());
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
        
        // 首先进行任务类型过滤：确保个人任务和团队任务完全分离
        let matchesTaskType = true;
        if (effectiveTeamId) {
          // 在团队环境下，只显示属于当前团队的任务
          matchesTaskType = task.teamId?._id === effectiveTeamId;
        } else {
          // 在个人任务环境下，只显示个人任务（没有teamId的任务）
          matchesTaskType = !task.teamId;
        }
        
        // 组匹配逻辑：根据点击的是父组还是子组来决定显示范围
        let matchesGroup = true; // 默认显示所有任务
        
        // 如果currentGroup是'all'，显示所有个人任务
        if (currentGroup === 'all' && !effectiveTeamId) {
          matchesGroup = true; // 显示所有个人任务
        }
        // 如果在团队环境下且没有指定组，显示该团队的所有任务
        else if (effectiveTeamId && (!currentGroup || currentGroup === 'ungrouped')) {
          matchesGroup = true; // 已经通过matchesTaskType过滤了
        }
        // 如果指定了具体的组
        else if (currentGroup && currentGroup !== 'all') {
          const isCurrentGroupSubgroup = isSubgroup(currentGroup, availableGroups);
          const groupField = effectiveTeamId ? 'teamGroup' : 'group';
          
          if (isCurrentGroupSubgroup) {
            // 如果点击的是子组，只显示该子组的任务
            matchesGroup = task[groupField] === currentGroup;
          } else {
            // 如果点击的是父组，显示父组及其所有子组的任务
            const allSubgroupIds = getAllSubgroupIds(currentGroup, availableGroups);
            matchesGroup = task[groupField] === currentGroup || allSubgroupIds.includes(task[groupField]);
          }
        }
        
        return matchesSearch && matchesStatus && matchesPriority && matchesTaskType && matchesGroup;
      });
    }, [tasks, searchText, filterStatus, filterPriority, currentGroup, availableGroups, effectiveTeamId]);



    /**
   * 处理任务更新的函数
   * @param {Object} values - 表单值
   */
  const handleUpdateTask = async (values) => {
    try {
      const taskData = {
        ...values,
        dueDate: values.dueDate ? dayjs(values.dueDate).toISOString() : null
      };
      
      // 根据任务类型处理分组字段
      if (effectiveTeamId) {
        // 团队任务：使用teamGroup字段
        taskData.teamGroup = values.group;
        delete taskData.group;
        await dispatch(updateTeamTask({ taskId: editingTask._id, updates: taskData })).unwrap();
      } else {
        // 个人任务：使用group字段
        await dispatch(updateTaskAsync({ taskId: editingTask._id, updates: taskData })).unwrap();
      }
      
      message.success(t('tasks.taskUpdatedSuccess'));
      setIsModalVisible(false);
      setEditingTask(null);
      form.resetFields();
      
      // 不需要手动刷新任务列表，reducer会自动更新
    } catch (error) {
      console.error('Task update error:', error);
      if (error?.msg?.includes('Not authorized') || (error.response && error.response.status === 403)) {
        message.error(t('tasks.taskUpdatedFailed'));
      } else {
        message.error(t('tasks.taskUpdatedFailed'));
      }
    }
  };

    /**
   * 处理任务删除的函数
   * @param {string} taskId - 任务ID
   */
  const handleDeleteTask = async (taskId) => {
    try {
      if (effectiveTeamId) {
        await dispatch(deleteTeamTask(taskId)).unwrap();
      } else {
        await dispatch(deleteTaskAsync(taskId)).unwrap();
      }
      
      message.success(t('tasks.taskDeletedSuccess'));
      
      // Redux会自动更新任务列表，不需要手动刷新
    } catch (error) {
      console.error('Task deletion error:', error);
      message.error(t('tasks.taskDeletedFailed'));
    }
  };

    /**
     * 处理编辑任务的函数
     * @param {Object} task - 要编辑的任务对象
     */
    const handleEditTask = (task) => {
      setEditingTask(task);
      setIsModalVisible(true);
      
      // 重置表单并设置初始值
      form.resetFields();
      
      // 根据任务类型设置正确的分组字段值
      const formValues = {
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        // 统一使用group字段名，但值来自正确的源字段
        group: effectiveTeamId ? (task.teamGroup || 'ungrouped') : (task.group || 'ungrouped'),
        // 修复日期选择器乱跳问题：确保moment对象正确处理，使用中文locale
        dueDate: task.dueDate ? dayjs(task.dueDate) : null
      };
      
      // 使用setTimeout确保表单完全渲染后再设置值，避免DatePicker乱跳
      setTimeout(() => {
        form.setFieldsValue(formValues);
      }, 100);
    };

    const handleViewTask = (taskId) => {
      navigate(`/tasks/${taskId}`);
    };

    /**
   * 获取优先级颜色
   * @param {string} priority - 优先级
   * @returns {string} 颜色值
   */
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return themeColors.highPriority;
      case 'medium': return themeColors.mediumPriority;
      case 'low': return themeColors.lowPriority;
      default: return themeColors.defaultColor;
    }
  };

    /**
   * 获取状态颜色
   * @param {string} status - 状态
   * @returns {string} 颜色值
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return themeColors.completedStatus;
      case 'in-progress': return themeColors.inProgressStatus;
      case 'pending': return themeColors.pendingStatus;
      default: return themeColors.defaultColor;
    }
  };

    const getStatusIcon = (status) => {
      switch (status) {
        case 'completed': return <CheckCircleOutlined />;
        case 'in-progress': return <ClockCircleOutlined />;
        case 'pending': return <ExclamationCircleOutlined />;
        default: return <ClockCircleOutlined />;
      }
    };

  /**
   * 函数级注释：计算时间差并返回国际化格式
   * 根据当前语言显示相应的时间格式，精确显示几天几小时的格式
   * @param {string} dateTime - 时间字符串
   * @returns {string} 国际化格式的时间差
   */
  const getTimeAgo = (dateTime) => {
    const now = dayjs();
    const time = dayjs(dateTime);
    const diffInMinutes = now.diff(time, 'minutes');
    const diffInHours = now.diff(time, 'hours');
    const diffInDays = now.diff(time, 'days');
    const diffInMonths = now.diff(time, 'months');
    const diffInYears = now.diff(time, 'years');
    const isEnglish = i18n.language === 'en';

    if (diffInMinutes < 1) {
      return isEnglish ? 'just now' : '刚刚';
    } else if (diffInMinutes < 60) {
      return isEnglish ? `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago` : `${diffInMinutes}分钟前`;
    } else if (diffInHours < 24) {
      const remainingMinutes = diffInMinutes % 60;
      if (remainingMinutes > 0) {
        return isEnglish 
          ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''} ago`
          : `${diffInHours}小时${remainingMinutes}分钟前`;
      } else {
        return isEnglish ? `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago` : `${diffInHours}小时前`;
      }
    } else if (diffInDays < 30) {
      const remainingHours = diffInHours % 24;
      if (remainingHours > 0) {
        return isEnglish 
          ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''} ago`
          : `${diffInDays}天${remainingHours}小时前`;
      } else {
        return isEnglish ? `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago` : `${diffInDays}天前`;
      }
    } else if (diffInMonths < 12) {
      return isEnglish ? `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago` : `${diffInMonths}个月前`;
    } else {
      return isEnglish ? `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago` : `${diffInYears}年前`;
    }
  };

    /**
     * 函数级注释：渲染任务卡片
     * @param {Object} task - 任务对象
     * @param {Object} themeColors - 主题颜色对象
     * @returns {JSX.Element} 任务卡片组件
     */
    const renderTaskCard = (task, themeColors) => {
      // 修复isOverdue逻辑：确保只有真正超期的任务才显示红色
      const now = dayjs();
      const dueDate = task.dueDate ? dayjs(task.dueDate) : null;
      const isOverdue = dueDate && dueDate.isBefore(now) && task.status !== 'completed';
      
      // 调试信息（开发环境）
      if (process.env.NODE_ENV === 'development' && task.dueDate) {
        console.log(`Task: ${task.title}, Due: ${dueDate.format('YYYY-MM-DD HH:mm')}, Now: ${now.format('YYYY-MM-DD HH:mm')}, IsOverdue: ${isOverdue}`);
      }
      
      return (
          <Card 
            className="task-card"
            hoverable
            style={{ 
              height: '100%',
              borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: themeColors.cardBackground,
              ...(isOverdue && { borderColor: '#ff4d4f' })
            }}
            styles={{
              body: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '16px'
              }
            }}
            onClick={() => handleViewTask(task._id)}
            actions={[
              <Tooltip title={t('common.view')}>
                <Button 
                  type="text" 
                  icon={<EyeOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewTask(task._id);
                  }}
                />
              </Tooltip>,
              <Tooltip title={t('common.edit')}>
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTask(task);
                  }}
                />
              </Tooltip>,
              <Tooltip title={t('common.assign')}>
                <Button 
                  type="text" 
                  icon={<ShareAltOutlined />} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAssignTask(task);
                  }}
                />
              </Tooltip>,
              <Popconfirm
                title={t('tasks.deleteTask')}
                description={t('tasks.confirmDeleteTask')}
                onConfirm={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task._id);
                }}
                okText={t('common.confirm')}
                cancelText={t('common.cancel')}
              >
                <Tooltip title={t('common.delete')}>
                  <Button 
                    type="text" 
                    icon={<DeleteOutlined />} 
                    danger
                    onClick={(e) => e.stopPropagation()}
                  />
                </Tooltip>
              </Popconfirm>
            ]}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Row justify="space-between" align="top" style={{ flex: 1 }}>
                <Col span={18}>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Title level={5} style={{ margin: 0, color: isOverdue ? '#ff4d4f' : 'inherit' }}>
                      {task.title}
                    </Title>
                    <Text type="secondary" ellipsis style={{ color: isOverdue ? '#ff4d4f' : 'inherit' }}>
                      {task.description}
                    </Text>
                    <div style={{ marginTop: 'auto' }}>
                      <Space wrap>
                        <Tag 
                          color={isOverdue ? undefined : getPriorityColor(task.priority)} 
                          icon={<FlagOutlined style={isOverdue ? { color: '#ff4d4f' } : {}} />} 
                          style={isOverdue ? { color: '#ff4d4f', borderColor: '#ff4d4f', backgroundColor: 'transparent' } : {}}
                        >
                          <span style={isOverdue ? { color: '#ff4d4f' } : {}}>
                            {task.priority?.toUpperCase() || 'MEDIUM'}
                          </span>
                        </Tag>
                        <Tag 
                          color={isOverdue ? undefined : getStatusColor(task.status)} 
                          icon={React.cloneElement(getStatusIcon(task.status), { style: isOverdue ? { color: '#ff4d4f' } : {} })} 
                          style={isOverdue ? { color: '#ff4d4f', borderColor: '#ff4d4f', backgroundColor: 'transparent' } : {}}
                        >
                          <span style={isOverdue ? { color: '#ff4d4f' } : {}}>
                            {task.status?.replace('-', ' ').toUpperCase() || 'PENDING'}
                          </span>
                        </Tag>
                        {/* 统一处理分组标签显示 */}
                        {((effectiveTeamId && task.teamGroup && task.teamGroup !== 'ungrouped') || 
                          (!effectiveTeamId && task.group && task.group !== 'ungrouped')) && (
                          <Tag 
                            color={isOverdue ? undefined : 'blue'} 
                            style={isOverdue ? { color: '#ff4d4f', borderColor: '#ff4d4f', backgroundColor: 'transparent' } : {}}
                          >
                            <span style={isOverdue ? { color: '#ff4d4f' } : {}}>
                              {findGroupName(effectiveTeamId ? task.teamGroup : task.group)}
                            </span>
                          </Tag>
                        )}
                      </Space>
                    </div>
                  </Space>
                </Col>
                <Col span={6} style={{ textAlign: 'right' }}>
                  <Space direction="vertical" size="small" align="end">
                    {task.dueDate && (
                      <Space size="small">
                        <CalendarOutlined style={{ color: isOverdue ? '#ff4d4f' : '#1890ff' }} />
                        <Text 
                          style={{ 
                            fontSize: '12px',
                            color: isOverdue ? '#ff4d4f' : '#666'
                          }}
                        >
                          {dayjs(task.dueDate).format('MMM DD')}
                        </Text>
                      </Space>
                    )}
                    <Text type="secondary" style={{ fontSize: '12px', color: isOverdue ? '#ff4d4f' : 'inherit' }}>
                      {getTimeAgo(task.createdAt)}
                    </Text>
                  </Space>
                </Col>
              </Row>
            </div>
          </Card>
      );
    };

    /**
     * 函数级注释：生成页面标题
     * 根据当前是否在团队环境和选中的组来生成合适的标题
     * @returns {string} 页面标题
     */
    const getPageTitle = () => {
      if (effectiveTeamId) {
        // 团队环境下的标题
        const currentTeam = teams.find(team => team._id === effectiveTeamId);
        const teamName = currentTeam ? currentTeam.name : 'Unknown Team';
        
        if (currentGroup && currentGroup !== 'ungrouped') {
          const groupName = findGroupName(currentGroup);
          return `${teamName} - ${groupName} ${t('tasks.allTasks')}`;
        } else {
          return `${teamName} ${t('tasks.allTasks')}`;
        }
      } else {
        // 个人环境下的标题
        if (currentGroup && currentGroup !== 'all') {
          const groupName = findGroupName(currentGroup);
          return `${groupName} ${t('tasks.allTasks')}`;
        }
        return t('tasks.allTasks');
      }
    };

    return (
      <div style={{ padding: '0 24px 24px 24px' }}>
        {/* Header */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              {getPageTitle()}
              <Badge 
                count={filteredTasks.length} 
                style={{ 
                  backgroundColor: '#1890ff',
                  marginLeft: 12
                }} 
              />
            </Title>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTask(null);
                setIsModalVisible(true);
                form.resetFields();
                // Set default group if we're in a specific group view
                if (currentGroup) form.setFieldsValue({ group: currentGroup });
              }}
            >
              {t('tasks.addTask')}
            </Button>
          </Col>
        </Row>

        {/* Filters */}
        <Card style={{ marginBottom: 24 }}>
          <Row gutter={16} align="middle">
            <Col xs={24} sm={12} md={8}>
              <Search
                placeholder={t('tasks.searchTasks')}
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder={t('tasks.status')}
                value={filterStatus || 'all'}
                onChange={setFilterStatus}
                style={{ width: '100%' }}
              >
                <Option value="all">{t('tasks.allStatus')}</Option>
                <Option value="pending">{t('tasks.pending')}</Option>
                <Option value="in-progress">{t('tasks.inProgress')}</Option>
                <Option value="completed">{t('tasks.completed')}</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder={t('tasks.priority')}
                value={filterPriority || 'all'}
                onChange={setFilterPriority}
                style={{ width: '100%' }}
              >
                <Option value="all">{t('tasks.allPriority')}</Option>
                <Option value="high">{t('tasks.high')}</Option>
                <Option value="medium">{t('tasks.medium')}</Option>
                <Option value="low">{t('tasks.low')}</Option>
              </Select>
            </Col>
          </Row>
        </Card>

        {/* Task List */}
        {filteredTasks.length === 0 ? (
          <Empty 
            description={t('tasks.noTasksFound')}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingTask(null);
                setIsModalVisible(true);
                form.resetFields();
                if (currentGroup) form.setFieldsValue({ group: currentGroup });
              }}
            >
              {t('tasks.createTask')}
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {filteredTasks.map(task => (
              <Col xs={24} sm={12} md={8} lg={6} key={task._id}>
                {renderTaskCard(task, themeColors)}
              </Col>
            ))}
          </Row>
        )}
        {/* Create/Edit Task Modal */}
        <Modal
          title={editingTask ? t('tasks.editTask') : t('tasks.createNewTask')}
          open={isModalVisible}
          onCancel={() => {
            setIsModalVisible(false);
            setEditingTask(null);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={editingTask ? handleUpdateTask : handleCreateTask}
            initialValues={{
              priority: 'medium',
              status: 'pending',
              group: currentGroup || 'ungrouped'
            }}
          >
            <Form.Item
              name="title"
              label={t('tasks.taskTitle')}
              rules={[{ required: true, message: t('tasks.pleaseEnterTaskTitle') }]}
            >
              <Input placeholder={t('tasks.enterTaskTitle')} />
            </Form.Item>

            <Form.Item
              name="description"
              label={t('tasks.taskDescription')}
              rules={[{ required: true, message: t('tasks.pleaseEnterTaskDescription') }]}
            >
              <Input.TextArea 
                rows={4} 
                placeholder={t('tasks.enterTaskDescription')} 
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="priority"
                  label={t('tasks.priority')}
                  rules={[{ required: true, message: t('tasks.pleaseSelectPriority') }]}
                >
                  <Select placeholder={t('tasks.selectPriority')}>
                    <Option value="low">{t('tasks.low')}</Option>
                    <Option value="medium">{t('tasks.medium')}</Option>
                    <Option value="high">{t('tasks.high')}</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label={t('tasks.status')}
                  rules={[{ required: true, message: t('tasks.pleaseSelectStatus') }]}
                >
                  <Select placeholder={t('tasks.selectStatus')}>
                    <Option value="pending">{t('tasks.pending')}</Option>
                    <Option value="in-progress">{t('tasks.inProgress')}</Option>
                    <Option value="completed">{t('tasks.completed')}</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="group"
                  label={t('tasks.group')}
                >
                  <Select placeholder={t('tasks.selectGroup')}>
                    {generateGroupOptions()}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="dueDate"
                  label={t('tasks.dueDate')}
                >
                  <DatePicker 
                    style={{ width: '100%' }}
                    placeholder={t('tasks.selectDueDate')}
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    allowClear
                    inputReadOnly
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button 
                  onClick={() => {
                    setIsModalVisible(false);
                    setEditingTask(null);
                    form.resetFields();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit" loading={loading}>
                  {editingTask ? t('tasks.updateTask') : t('tasks.createTask')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 任务分配模态框 */}
        <Modal
          title={t('tasks.assignTask')}
          open={isAssignModalVisible}
          onCancel={() => {
            setIsAssignModalVisible(false);
            setAssigningTask(null);
            assignForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={assignForm}
            layout="vertical"
            onFinish={handleTaskAssignment}
          >
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Text strong>{t('tasks.task')}: </Text>
              <Text>{assigningTask?.title}</Text>
            </div>

            <Form.Item
              name="targetType"
              label={t('tasks.targetType')}
              rules={[{ required: true, message: t('tasks.pleaseSelectTargetType') }]}
            >
              <Select placeholder={t('tasks.assignTaskTo')}>
                <Option value="personal">{t('tasks.personalTask')}</Option>
                <Option value="team">{t('tasks.teamTask')}</Option>
              </Select>
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => 
                prevValues.targetType !== currentValues.targetType
              }
            >
              {({ getFieldValue }) => {
                const targetType = getFieldValue('targetType');
                
                return targetType === 'team' ? (
                  <Form.Item
                    name="targetTeam"
                    label={t('tasks.targetTeam')}
                    rules={[{ required: true, message: t('tasks.pleaseSelectTargetTeam') }]}
                  >
                    <Select placeholder={t('tasks.selectTeam')}>
                      {teams.map(team => (
                        <Option key={team._id} value={team._id}>{team.name}</Option>
                      ))}
                    </Select>
                  </Form.Item>
                ) : null;
              }}
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => {
                // 当目标团队改变时，获取该团队的组数据
                if (prevValues.targetTeam !== currentValues.targetTeam && currentValues.targetTeam) {
                  fetchTargetTeamGroups(currentValues.targetTeam);
                  // 清空目标组选择
                  assignForm.setFieldsValue({ targetGroup: undefined });
                }
                return prevValues.targetType !== currentValues.targetType ||
                       prevValues.targetTeam !== currentValues.targetTeam;
              }}
            >
              {({ getFieldValue }) => {
                const targetType = getFieldValue('targetType');
                const targetTeam = getFieldValue('targetTeam');
                
                // 根据目标类型获取相应的组选项
                const getGroupOptions = () => {
                  if (targetType === 'team' && targetTeam) {
                    // 使用动态获取的目标团队组数据
                    return targetTeamGroups.map(group => (
                      <Option key={group.id} value={group.id}>{group.name}</Option>
                    ));
                  } else if (targetType === 'personal') {
                    // 获取个人组
                    return generateGroupOptions();
                  }
                  return [];
                };
                
                return (
                  <Form.Item
                    name="targetGroup"
                    label={t('tasks.group')}
                    rules={[{ required: true, message: t('tasks.selectGroup') }]}
                  >
                    <Select 
                      placeholder={t('tasks.selectGroup')}
                      loading={targetType === 'team' && targetTeam && targetTeamGroups.length === 0}
                    >
                      {getGroupOptions()}
                    </Select>
                  </Form.Item>
                );
              }}
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button 
                  onClick={() => {
                    setIsAssignModalVisible(false);
                    setAssigningTask(null);
                    assignForm.resetFields();
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="primary" htmlType="submit">
                  {t('tasks.assignTask')}
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
  };

  export default TaskList;