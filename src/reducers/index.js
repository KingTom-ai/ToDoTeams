import { combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './tasks';
import teamsReducer from './teams';
import groupsReducer from './groups';
import teamgroupsReducer from './teamgroups';

const rootReducer = combineReducers({
  tasks: tasksReducer,
  teams: teamsReducer,
  groups: groupsReducer,
  teamgroups: teamgroupsReducer,
});

export default rootReducer;