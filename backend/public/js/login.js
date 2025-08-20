// 登录页面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('error-message');

    // 检查是否已经登录
    const token = localStorage.getItem('adminToken');
    if (token) {
        // 验证token是否有效 - 使用简单的验证端点
        fetch('/api/admin/users?limit=1', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/admin/dashboard';
            } else {
                console.log('Token验证失败，状态码:', response.status);
                localStorage.removeItem('adminToken');
            }
        })
        .catch(error => {
            console.error('Token验证失败:', error);
            localStorage.removeItem('adminToken');
        });
    }

    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // 验证输入
        if (!username || !password) {
            showError('请输入用户名和密码');
            return;
        }
        
        console.log('Login attempt with username:', username); // 调试日志
        
        // 隐藏错误消息
        errorMessage.style.display = 'none';
        
        // 显示加载状态
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = '登录中...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier: username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // 检查用户是否有管理员权限
                if (data.user && (data.user.role === 'admin' || data.user.role === 'super_admin')) {
                    // 保存token
                    localStorage.setItem('adminToken', data.token);
                    localStorage.setItem('adminUser', JSON.stringify(data.user));
                    
                    // 跳转到控制台
                    window.location.href = '/admin/dashboard';
                } else {
                    showError('您没有管理员权限');
                }
            } else {
                showError(data.message || '登录失败，请检查用户名和密码');
            }
        } catch (error) {
            console.error('登录错误:', error);
            showError('网络错误，请稍后重试');
        } finally {
            // 恢复按钮状态
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
    
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
    
    // 回车键登录
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });
});

// 工具函数：API请求
function apiRequest(url, options = {}) {
    const token = localStorage.getItem('adminToken');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options })
        .then(response => {
            if (response.status === 401) {
                // Token过期或无效，跳转到登录页
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/';
                return Promise.reject('未授权');
            }
            return response;
        });
}