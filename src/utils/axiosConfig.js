import axios from 'axios';

/**
 * 配置axios拦截器处理token过期和全局错误
 */

// 请求拦截器：自动添加token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理token过期和其他错误
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      
      // 处理401未授权错误（token过期或无效）
      if (status === 401) {
        // 清除本地存储的认证信息
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        window.location.href = '/login';
        return Promise.reject(new Error('Token expired'));
      }
      // Remove all static message.error calls
      // For other errors, just reject the promise
      const errorMessage = data?.msg || data?.error || `请求失败 (${status})`;
      // message.error(errorMessage);
    } else if (error.request) {
      // Remove message.error('网络连接失败，请检查网络设置');
      return Promise.reject(error);
    } else {
      // Remove message.error('请求处理失败');
      return Promise.reject(error);
    }
    
    return Promise.reject(error);
  }
);

export default axios;