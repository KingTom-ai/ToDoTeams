import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import axios from '../utils/axiosConfig';

// 异步操作
export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      // 修改为相对路径，通过代理转发到后端
      const response = await axios.get('/api/groups', {
        headers: { 'x-auth-token': token }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to fetch groups');
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async ({ parentId, group }, { rejectWithValue }) => {
    try {
      console.log('createGroup called with:', { parentId, group });
      const token = localStorage.getItem('token');
      console.log('Token:', token ? 'exists' : 'missing');
      const requestData = {
        name: group.name,
        parentId,
        type: group.type,
        color: group.color,
        icon: group.icon
      };
      console.log('Sending request with data:', requestData);
      // 修改为相对路径，通过代理转发到后端
      const response = await axios.post('/api/groups', requestData, {
        headers: { 'x-auth-token': token }
      });
      console.log('Response received:', response.data);
      return { parentId, group: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create group');
    }
  }
);

export const updateGroupAsync = createAsyncThunk(
  'groups/updateGroup',
  async ({ id, name, color, icon, collapsed }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      // 修改为相对路径，通过代理转发到后端
      const response = await axios.put(`/api/groups/${id}`, {
        name,
        color,
        icon,
        collapsed
      }, {
        headers: { 'x-auth-token': token }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to update group');
    }
  }
);

export const deleteGroupAsync = createAsyncThunk(
  'groups/deleteGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      // 修改为相对路径，通过代理转发到后端
      await axios.delete(`/api/groups/${groupId}`, {
        headers: { 'x-auth-token': token }
      });
      return groupId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to delete group');
    }
  }
);

export const initializeGroups = createAsyncThunk(
  'groups/initializeGroups',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      // 修改为相对路径，通过代理转发到后端
      await axios.post('/api/groups/initialize', {}, {
        headers: { 'x-auth-token': token }
      });
      // 初始化后重新获取组数据
      const response = await axios.get('/api/groups', {
        headers: { 'x-auth-token': token }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error || 'Failed to initialize groups');
    }
  }
);

const initialState = {
  groups: [],
  loading: false,
  error: null
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    // 保留本地同步操作用于兼容性
    setGroups: (state, action) => {
      state.groups = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // fetchGroups
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        // 确保每个组都有有效的id，过滤掉无效数据
        const validateGroups = (groups) => {
          return groups.filter(group => {
            if (!group._id && !group.id) {
              console.warn('Group missing id:', group);
              return false;
            }
            // 转换_id为id格式
            if (group._id && !group.id) {
              group.id = group._id;
            }
            // 递归验证子组
            if (group.children && Array.isArray(group.children)) {
              group.children = validateGroups(group.children);
            }
            return true;
          });
        };
        state.groups = validateGroups(action.payload || []);
        state.error = null;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createGroup
      .addCase(createGroup.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createGroup.fulfilled, (state, action) => {
        state.loading = false;
        const { parentId, group } = action.payload;
        
        // 转换后端数据格式为前端格式
        const formattedGroup = {
          id: group._id,
          name: group.name,
          type: group.type,
          color: group.color,
          icon: group.icon,
          children: []
        };
        
        if (parentId) {
          // 添加子组
          const findAndAddChild = (groups) => {
            for (let g of groups) {
              if (g.id === parentId) {
                if (!g.children) {
                  g.children = [];
                }
                g.children.push(formattedGroup);
                return true;
              }
              if (g.children && findAndAddChild(g.children)) {
                return true;
              }
            }
            return false;
          };
          findAndAddChild(state.groups);
        } else {
          // 添加顶级组
          state.groups.push(formattedGroup);
        }
        state.error = null;
      })
      .addCase(createGroup.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // updateGroupAsync
      .addCase(updateGroupAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateGroupAsync.fulfilled, (state, action) => {
        state.loading = false;
        const updatedGroup = action.payload;
        
        const findAndUpdate = (groups) => {
          for (let group of groups) {
            if (group.id === updatedGroup._id) {
              group.name = updatedGroup.name;
              group.color = updatedGroup.color;
              group.icon = updatedGroup.icon;
              group.collapsed = updatedGroup.collapsed;
              return true;
            }
            if (group.children && findAndUpdate(group.children)) {
              return true;
            }
          }
          return false;
        };
        findAndUpdate(state.groups);
        state.error = null;
      })
      .addCase(updateGroupAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // deleteGroupAsync
      .addCase(deleteGroupAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteGroupAsync.fulfilled, (state, action) => {
        state.loading = false;
        const groupId = action.payload;
        
        const findAndDelete = (groups, parentArray = null, index = -1) => {
          for (let i = 0; i < groups.length; i++) {
            if (groups[i].id === groupId) {
              if (parentArray) {
                parentArray.splice(index, 1);
              } else {
                state.groups.splice(i, 1);
              }
              return true;
            }
            if (groups[i].children && findAndDelete(groups[i].children, groups, i)) {
              return true;
            }
          }
          return false;
        };
        findAndDelete(state.groups);
        state.error = null;
      })
      .addCase(deleteGroupAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // initializeGroups
      .addCase(initializeGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initializeGroups.fulfilled, (state, action) => {
        state.loading = false;
        // 转换后端数据格式
        const formatGroups = (groups) => {
          return groups.map(group => ({
            id: group._id,
            name: group.name,
            type: group.type,
            color: group.color,
            icon: group.icon,
            children: group.children ? formatGroups(group.children) : []
          }));
        };
        state.groups = formatGroups(action.payload);
        state.error = null;
      })
      .addCase(initializeGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { setGroups, clearError } = groupsSlice.actions;
export const selectGroups = createSelector(
  state => state.groups.groups,
  groups => groups || []
);

export default groupsSlice.reducer;