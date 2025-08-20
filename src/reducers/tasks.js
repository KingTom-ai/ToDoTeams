import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from '../utils/axiosConfig';

export const fetchTasks = createAsyncThunk('tasks/fetchTasks', async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.get('/api/tasks', { headers: { 'x-auth-token': token } });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to fetch tasks');
  }
});

// 根据团队ID获取任务
export const fetchTeamTasks = createAsyncThunk('tasks/fetchTeamTasks', async (teamId, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.get(`/api/tasks/team/${teamId}`, { headers: { 'x-auth-token': token } });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to fetch tasks');
  }
});

/**
 * 创建个人任务的异步thunk
 * @param {Object} taskData - 任务数据
 */
export const createTask = createAsyncThunk('tasks/createTask', async (taskData, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.post('/api/tasks', taskData, {
      headers: { 'x-auth-token': token }
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to create task');
  }
});

// 创建团队任务
export const createTeamTask = createAsyncThunk('tasks/createTeamTask', async (taskData, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.post('/api/tasks', taskData, {
      headers: { 'x-auth-token': token }
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to create task');
  }
});

// 更新任务
export const updateTaskAsync = createAsyncThunk('tasks/updateTask', async ({ taskId, updates }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.put(`/api/tasks/${taskId}`, updates, {
      headers: { 'x-auth-token': token }
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to update task');
  }
});

// 更新团队任务
export const updateTeamTask = createAsyncThunk('tasks/updateTeamTask', async ({ taskId, updates }, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    const response = await axios.put(`/api/tasks/${taskId}`, updates, {
      headers: { 'x-auth-token': token }
    });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to update task');
  }
});

// 删除任务
export const deleteTaskAsync = createAsyncThunk('tasks/deleteTask', async (taskId, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    await axios.delete(`/api/tasks/${taskId}`, {
      headers: { 'x-auth-token': token }
    });
    return taskId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to delete task');
  }
});

// 删除团队任务
export const deleteTeamTask = createAsyncThunk('tasks/deleteTeamTask', async (taskId, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem('token');
    // 修改为相对路径，通过代理转发到后端
    await axios.delete(`/api/tasks/${taskId}`, {
      headers: { 'x-auth-token': token }
    });
    return taskId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.msg || 'Failed to delete task');
  }
});

const initialState = {
  tasks: [],
  loading: false,
  error: null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload;
      state.loading = false;
    },
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action) => {
      const index = state.tasks.findIndex(task => task._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
    },
    deleteTask: (state, action) => {
      state.tasks = state.tasks.filter(task => task._id !== action.payload);
    },
    setLoading: (state) => {
      state.loading = true;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        // 移除所有个人任务（没有teamId的任务），然后添加新的个人任务
        state.tasks = state.tasks.filter(task => task.teamId);
        state.tasks.push(...action.payload);
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTeamTasks.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeamTasks.fulfilled, (state, action) => {
        state.loading = false;
        // 移除指定团队的任务，然后添加新的团队任务
        const teamId = action.meta.arg; // 从thunk参数中获取teamId
        state.tasks = state.tasks.filter(task => !task.teamId || task.teamId._id !== teamId);
        state.tasks.push(...action.payload);
      })
      .addCase(fetchTeamTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 创建任务
      .addCase(createTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.push(action.payload);
      })
      .addCase(createTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 创建团队任务
      .addCase(createTeamTask.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTeamTask.fulfilled, (state, action) => {
        state.loading = false;
        state.tasks.push(action.payload);
      })
      .addCase(createTeamTask.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 更新任务
      .addCase(updateTaskAsync.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTaskAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      // 更新团队任务
      .addCase(updateTeamTask.fulfilled, (state, action) => {
        const index = state.tasks.findIndex(task => task._id === action.payload._id);
        if (index !== -1) {
          state.tasks[index] = action.payload;
        }
      })
      .addCase(updateTeamTask.rejected, (state, action) => {
        state.error = action.payload;
      })
      // 删除任务
      .addCase(deleteTaskAsync.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(task => task._id !== action.payload);
      })
      .addCase(deleteTaskAsync.rejected, (state, action) => {
        state.error = action.payload;
      })
      // 删除团队任务
      .addCase(deleteTeamTask.fulfilled, (state, action) => {
        state.tasks = state.tasks.filter(task => task._id !== action.payload);
      })
      .addCase(deleteTeamTask.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const selectTasksState = createSelector(
  (state) => state.tasks,
  (tasksState) => ({
    tasks: tasksState.tasks,
    loading: tasksState.loading
  })
);

export const { setTasks, addTask, updateTask, deleteTask, setLoading, setError } = tasksSlice.actions;
export default tasksSlice.reducer;