/**
 * 统一的主题颜色钩子
 * 用于在整个应用中保持一致的主题样式
 */
export const useThemeColors = () => {
  const currentTheme = localStorage.getItem('theme') || 'system';
  const isDark = currentTheme === 'dark' || (currentTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    primary: isDark ? '#177ddc' : '#1890ff',  // antd primary
    success: isDark ? '#49aa19' : '#52c41a',
    warning: isDark ? '#d89614' : '#faad14',
    error: isDark ? '#d32029' : '#ff4d4f',
    info: isDark ? '#177ddc' : '#1890ff',
    text: isDark ? '#ffffff' : '#000000',
    background: isDark ? '#141414' : '#ffffff',
    cardBackground: isDark ? '#1f1f1f' : '#f5f5f5',
    sidebarGradient: isDark ? 'linear-gradient(135deg, #1f1f1f 0%, #434343 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    highPriority: isDark ? '#d32029' : '#ff4d4f',
    mediumPriority: isDark ? '#d89614' : '#faad14',
    lowPriority: isDark ? '#49aa19' : '#52c41a',
    completedStatus: isDark ? '#49aa19' : '#52c41a',
    inProgressStatus: isDark ? '#177ddc' : '#1890ff',
    pendingStatus: isDark ? '#d89614' : '#faad14',
    defaultColor: isDark ? '#434343' : '#d9d9d9',
    avatarColors: isDark ? ['#d89614', '#7265e6', '#ffbf00', '#00a2ae'] : ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae'],
  };
};