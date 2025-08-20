import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { Layout, ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import 'dayjs/locale/en';

import { useThemeColors } from './theme';
import { Provider } from 'react-redux';
import store from './store';
import Login from './components/Login';
import Register from './components/Register';
import TaskList from './components/TaskList';
import TeamList from './components/TeamList';
import Sidebar from './components/Sidebar';
import TaskDetail from './components/TaskDetail';
import ResetPassword from './components/ResetPassword';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import axios from './utils/axiosConfig'; // 使用配置了拦截器的axios
import MessageCenter from './components/MessageCenter';
// Remove the duplicate import: import { App as AntApp } from 'antd';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
}

function AppContent({ currentTheme, setCurrentTheme, algorithm }) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [keyboardShortcut, setKeyboardShortcut] = useState('');
  const [showShortcut, setShowShortcut] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 快捷键功能
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'k':
            e.preventDefault();
            setKeyboardShortcut('Ctrl+K: Quick Search');
            setShowShortcut(true);
            setTimeout(() => setShowShortcut(false), 2000);
            // 实现快速搜索功能
            break;
          case 'n':
            e.preventDefault();
            setKeyboardShortcut('Ctrl+N: New Task');
            setShowShortcut(true);
            setTimeout(() => setShowShortcut(false), 2000);
            // 实现新建任务功能
            break;
          case '/':
            e.preventDefault();
            setKeyboardShortcut('Ctrl+/: Show Shortcuts');
            setShowShortcut(true);
            setTimeout(() => setShowShortcut(false), 3000);
            break;
          default:
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isAuthPage = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/reset-password' || location.pathname === '/';
  
  if (isAuthPage) {
    return (
      <div className="App">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<Login />} />
        </Routes>
      </div>
    );
  }

  return (
    <Layout className="main-layout" hasSider>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} setCurrentTheme={setCurrentTheme} />
      <Layout.Content 
        className="content-area"
        style={{ 
          transition: 'all 0.3s ease',
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 280),
        }}
      >
        <Routes>
            <Route path="/tasks" element={<PrivateRoute><TaskList /></PrivateRoute>} />
            <Route path="/tasks/:id" element={<PrivateRoute><TaskDetail /></PrivateRoute>} />
            <Route path="/teams" element={<PrivateRoute><TeamList /></PrivateRoute>} />
            <Route path="/teams/:teamId/tasks" element={<PrivateRoute><TaskList /></PrivateRoute>} />
            <Route path="/messages" element={<PrivateRoute><MessageCenter /></PrivateRoute>} />
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
        </Routes>
      </Layout.Content>
      
      {/* 快捷键提示 */}
      <div className={`keyboard-shortcut ${showShortcut ? 'show' : ''}`}>
        {keyboardShortcut}
      </div>
    </Layout>
  );
}

function App() {
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('theme') || 'system');
  const [algorithm, setAlgorithm] = useState([theme.defaultAlgorithm]);
  const colors = useThemeColors();
  useEffect(() => {
    document.documentElement.style.setProperty('--app-background-gradient', colors.sidebarGradient);
    document.documentElement.style.setProperty('--content-background', colors.background);
  }, [colors]);

  useEffect(() => {
    const applyTheme = (th) => {
      if (th === 'dark') {
        setAlgorithm([theme.darkAlgorithm]);
      } else if (th === 'light') {
        setAlgorithm([theme.defaultAlgorithm]);
      } else { // system
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setAlgorithm(isDark ? [theme.darkAlgorithm] : [theme.defaultAlgorithm]);
      }
    };

    applyTheme(currentTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      if (currentTheme === 'system') {
        setAlgorithm(e.matches ? [theme.darkAlgorithm] : [theme.defaultAlgorithm]);
      }
    };
    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [currentTheme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 修改为相对路径，通过代理转发到后端
      axios.get('/api/users/profile', { headers: { 'x-auth-token': token } })
        .then(res => {
          const userTheme = res.data.theme || 'system';
          setCurrentTheme(userTheme);
          localStorage.setItem('theme', userTheme);
          localStorage.setItem('userId', res.data._id);
        })
        .catch(err => {
  if (err.response && err.response.status === 401) {
    localStorage.removeItem('token');
  } else {
    console.error('Failed to fetch user theme', err);
  }
});
    }
  }, []);

  useEffect(() => {
    const lang = localStorage.getItem('i18nextLng');
    dayjs.locale(lang === 'zh' ? 'zh-cn' : 'en');
  }, []);

  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          algorithm,
        }}
        locale={localStorage.getItem('i18nextLng') === 'zh' ? zhCN : enUS}
      >
        <Router>
          <AppContent currentTheme={currentTheme} setCurrentTheme={setCurrentTheme} algorithm={algorithm} />
        </Router>
      </ConfigProvider>
    </Provider>
  );
}

export default App;
