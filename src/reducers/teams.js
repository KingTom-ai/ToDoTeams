import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from '../utils/axiosConfig';

// 获取团队列表
export const fetchTeams = createAsyncThunk(
  'teams/fetchTeams',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/teams', { 
        headers: { 'x-auth-token': token } 
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to fetch teams');
    }
  }
);

// 创建团队
export const createTeamAsync = createAsyncThunk(
  'teams/createTeamAsync',
  async (teamData, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/teams', teamData, { 
        headers: { 'x-auth-token': token } 
      });
      return response.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to create team');
    }
  }
);

// 删除团队
export const deleteTeamAsync = createAsyncThunk(
  'teams/deleteTeamAsync',
  async (teamId, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/teams/${teamId}`, { 
        headers: { 'x-auth-token': token } 
      });
      return teamId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to delete team');
    }
  }
);

const initialState = {
  teams: [],
  loading: false,
  error: null,
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {
    setTeams: (state, action) => {
      state.teams = action.payload;
      state.loading = false;
    },
    addTeam: (state, action) => {
      state.teams.push(action.payload);
    },
    updateTeam: (state, action) => {
      const index = state.teams.findIndex(team => team._id === action.payload._id);
      if (index !== -1) {
        state.teams[index] = action.payload;
      }
    },
    deleteTeam: (state, action) => {
      state.teams = state.teams.filter(team => team._id !== action.payload);
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
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 创建团队
      .addCase(createTeamAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(createTeamAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.teams.push(action.payload);
      })
      .addCase(createTeamAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // 删除团队
      .addCase(deleteTeamAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteTeamAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = state.teams.filter(team => team._id !== action.payload);
      })
      .addCase(deleteTeamAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setTeams, addTeam, updateTeam, deleteTeam, setLoading, setError } = teamsSlice.actions;
export default teamsSlice.reducer;