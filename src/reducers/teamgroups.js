import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { createSelector } from 'reselect';
import axios from '../utils/axiosConfig';
import { deleteTeamAsync } from './teams';

// 获取团队分组
export const fetchTeamGroups = createAsyncThunk(
  'teamgroups/fetchTeamGroups',
  async (teamId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/teamgroups/${teamId}`, { headers: { 'x-auth-token': token } });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch team groups');
    }
  }
);

// 创建团队分组
export const createTeamGroup = createAsyncThunk(
  'teamgroups/createTeamGroup',
  async ({ teamId, group }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`/api/teamgroups/${teamId}`, group, { headers: { 'x-auth-token': token } });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create team group');
    }
  }
);

// 更新团队分组
export const updateTeamGroup = createAsyncThunk(
  'teamgroups/updateTeamGroup',
  async ({ id, updates }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`/api/teamgroups/${id}`, updates, { headers: { 'x-auth-token': token } });
      return res.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to update team group');
    }
  }
);

// 删除团队分组
export const deleteTeamGroup = createAsyncThunk(
  'teamgroups/deleteTeamGroup',
  async (id, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/teamgroups/${id}`, { headers: { 'x-auth-token': token } });
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete team group');
    }
  }
);

const teamgroupsSlice = createSlice({
  name: 'teamgroups',
  initialState: {
    groupsByTeam: {},
    loading: false,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeamGroups.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchTeamGroups.fulfilled, (state, action) => {
        const teamId = action.meta.arg;
        const validateGroups = (groups) => {
          return groups.filter(group => {
            if (!group._id && !group.id) return false;
            if (group._id && !group.id) group.id = group._id;
            if (group.children && Array.isArray(group.children)) {
              group.children = validateGroups(group.children);
            }
            return true;
          });
        };
        state.groupsByTeam[teamId] = validateGroups(action.payload || []);
        state.loading = false;
      })
      .addCase(fetchTeamGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createTeamGroup.fulfilled, (state, action) => {
        const { teamId, group } = action.meta.arg;
        const newGroup = action.payload;
        const formattedGroup = {
          id: newGroup._id,
          name: newGroup.name,
          type: newGroup.type,
          color: newGroup.color,
          icon: newGroup.icon,
          children: []
        };
        let groups = state.groupsByTeam[teamId] || [];
        if (group.parentId) {
          const findAndAddChild = (groups) => {
            for (let g of groups) {
              if (g.id === group.parentId) {
                if (!g.children) g.children = [];
                g.children.push(formattedGroup);
                return true;
              }
              if (g.children && findAndAddChild(g.children)) return true;
            }
            return false;
          };
          findAndAddChild(groups);
        } else {
          groups.push(formattedGroup);
        }
        state.groupsByTeam[teamId] = groups;
      })
      .addCase(updateTeamGroup.fulfilled, (state, action) => {
        const updatedGroup = action.payload;
        const findAndUpdate = (groups) => {
          for (let group of groups) {
            if (group.id === updatedGroup._id) {
              group.name = updatedGroup.name;
              // Add other fields if needed
              return true;
            }
            if (group.children && findAndUpdate(group.children)) return true;
          }
          return false;
        };
        Object.keys(state.groupsByTeam).forEach(teamId => {
          findAndUpdate(state.groupsByTeam[teamId]);
        });
      })
      .addCase(deleteTeamGroup.fulfilled, (state, action) => {
        const groupId = action.payload;
        const findAndDelete = (groups) => {
          for (let i = 0; i < groups.length; i++) {
            if (groups[i].id === groupId) {
              groups.splice(i, 1);
              return true;
            }
            if (groups[i].children && findAndDelete(groups[i].children)) return true;
          }
          return false;
        };
        Object.keys(state.groupsByTeam).forEach(teamId => {
          findAndDelete(state.groupsByTeam[teamId]);
        });
      })
      // 清理被删除团队的分组缓存
      .addCase(deleteTeamAsync.fulfilled, (state, action) => {
        const deletedTeamId = action.payload;
        if (deletedTeamId && state.groupsByTeam[deletedTeamId]) {
          delete state.groupsByTeam[deletedTeamId];
        }
      });
  }
});

export const selectTeamGroups = (teamId) => createSelector(
  state => state.teamgroups.groupsByTeam,
  groupsByTeam => groupsByTeam[teamId] || []
);

export default teamgroupsSlice.reducer;