// 控制台页面JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 检查登录状态
    checkAuth();
    
    // 初始化页面
    initDashboard();
    
    // 加载概览数据
    loadOverviewData();
});

// 检查认证状态
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    
    if (!token || !user.username) {
        window.location.href = '/admin';
        return;
    }
    
    // 显示当前用户
    document.getElementById('currentUser').textContent = user.username;
}

// 初始化控制台
function initDashboard() {
    // 导航菜单点击事件
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.dataset.section;
            switchSection(section);
        });
    });
    
    // 退出登录
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 模态框关闭
    const modal = document.getElementById('modal');
    const closeBtn = modal.querySelector('.close');
    closeBtn.addEventListener('click', () => modal.style.display = 'none');
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // 各种按钮事件
    setupButtonEvents();
}

// 设置按钮事件
function setupButtonEvents() {
    // 用户管理按钮
    document.getElementById('addUserBtn')?.addEventListener('click', showAddUserModal);
    
    // 团队管理按钮
    document.getElementById('addTeamBtn')?.addEventListener('click', showAddTeamModal);
    
    // 组管理按钮
    document.getElementById('addGroupBtn')?.addEventListener('click', showAddGroupModal);
    
    // 消息中心按钮
    document.getElementById('sendMessageBtn')?.addEventListener('click', showSendMessageModal);
    
    // 系统监控按钮
    document.getElementById('refreshSystemBtn')?.addEventListener('click', loadSystemData);
    
    // 搜索功能
    document.getElementById('userSearchBtn')?.addEventListener('click', searchUsers);
    document.getElementById('teamSearchBtn')?.addEventListener('click', searchTeams);
    
    // 回车搜索
    document.getElementById('userSearchInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
    
    document.getElementById('teamSearchInput')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchTeams();
        }
    });
}

// 切换页面区块
function switchSection(section) {
    // 隐藏所有区块
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    
    // 移除所有导航活跃状态
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    
    // 显示目标区块
    const targetSection = document.getElementById(`${section}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // 设置导航活跃状态
    const activeLink = document.querySelector(`[data-section="${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // 更新页面标题
    const titles = {
        overview: '系统概览',
        users: '用户管理',
        teams: '团队管理',
        tasks: '任务管理',
        messages: '消息中心',
        groups: '组管理',
        system: '系统监控',
        analytics: '统计分析'
    };
    document.getElementById('pageTitle').textContent = titles[section] || '管理系统';
    
    // 加载对应数据
    loadSectionData(section);
}

// 加载区块数据
function loadSectionData(section) {
    switch(section) {
        case 'overview':
            loadOverviewData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'teams':
            loadTeamsData();
            break;
        case 'tasks':
            loadTasksData();
            break;
        case 'messages':
            loadMessagesData();
            break;
        case 'groups':
            loadGroupsData();
            break;
        case 'system':
            loadSystemData();
            break;
        case 'analytics':
            loadAnalyticsData();
            break;
    }
}

// 加载概览数据 - 修改为获取所有数据
async function loadOverviewData() {
    try {
        const [usersRes, teamsRes, tasksRes, analyticsRes] = await Promise.all([
            apiRequest('/api/admin/users?limit=0'),
            apiRequest('/api/admin/teams?limit=0'),
            apiRequest('/api/admin/tasks?limit=0'),
            apiRequest('/api/admin/analytics/users')
        ]);
        
        const users = await usersRes.json();
        const teams = await teamsRes.json();
        const tasks = await tasksRes.json();
        const analytics = await analyticsRes.json();
        
        document.getElementById('totalUsers').textContent = users.total || users.users?.length || 0;
        document.getElementById('totalTeams').textContent = teams.total || teams.teams?.length || 0;
        document.getElementById('totalTasks').textContent = tasks.total || tasks.tasks?.length || 0;
        document.getElementById('activeUsers').textContent = analytics.activeUsers || 0;
    } catch (error) {
        console.error('加载概览数据失败:', error);
    }
}

// 加载用户数据
async function loadUsersData() {
    try {
        const response = await apiRequest('/api/admin/users?limit=0');
        const data = await response.json();
        const users = data.users || [];
        
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td><span class="status-badge status-${user.role}">${user.role}</span></td>
                <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? '活跃' : '非活跃'}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载用户数据失败:', error);
    }
}

// 加载团队数据
async function loadTeamsData() {
    try {
        const response = await apiRequest('/api/admin/teams');
        const data = await response.json();
        const teams = data.teams || [];
        
        const tbody = document.querySelector('#teamsTable tbody');
        tbody.innerHTML = '';
        
        teams.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team._id}</td>
                <td>${team.name}</td>
                <td>${team.description || '-'}</td>
                <td>${team.owner?.username || '-'}</td>
                <td>${team.memberCount || 0}</td>
                <td>${new Date(team.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editTeam('${team._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTeam('${team._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载团队数据失败:', error);
    }
}

// 加载任务数据
async function loadTasksData() {
    try {
        const response = await apiRequest('/api/admin/tasks?limit=0');  // 添加limit=0以获取所有
        const data = await response.json();
        const tasks = data.tasks || [];
        
        const tbody = document.querySelector('#tasksTable tbody');
        tbody.innerHTML = '';
        
        tasks.forEach(task => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${task._id}</td>
                <td>${task.title}</td>
                <td>${task.team?.name || '-'}</td>
                <td>${task.creator?.username || '-'}</td>
                <td><span class="status-badge status-${task.status}">${task.status}</span></td>
                <td><span class="status-badge status-${task.priority}">${task.priority}</span></td>
                <td>${new Date(task.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="viewTask('${task._id}')">查看</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTask('${task._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载任务数据失败:', error);
    }
}

// 加载消息数据
async function loadMessagesData() {
    try {
        const response = await apiRequest('/api/admin/messages');
        const data = await response.json();
        const messages = data.messages || [];
        
        const tbody = document.querySelector('#messagesTable tbody');
        tbody.innerHTML = '';
        
        messages.forEach(message => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${message._id}</td>
                <td>${message.sender?.username || '-'}</td>
                <td>${message.receiver?.username || '全体'}</td>
                <td>${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}</td>
                <td>${message.type}</td>
                <td><span class="status-badge status-${message.status}">${message.status}</span></td>
                <td>${new Date(message.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="viewMessage('${message._id}')">查看</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteMessage('${message._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载消息数据失败:', error);
    }
}

// 加载组数据
async function loadGroupsData() {
    try {
        const response = await apiRequest('/api/admin/groups?limit=0');
        const data = await response.json();
        const groups = data.groups || [];
        
        const tbody = document.querySelector('#groupsTable tbody');
        tbody.innerHTML = '';
        
        groups.forEach(group => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${group._id}</td>
                <td>${group.name}</td>
                <td>${group.description || '-'}</td>
                <td>${group.creator?.username || '-'}</td>
                <td>${group.memberCount || 0}</td>
                <td>${new Date(group.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editGroup('${group._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteGroup('${group._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('加载组数据失败:', error);
    }
}

// 加载系统数据 - 确保显示正确信息
async function loadSystemData() {
    try {
        const [performanceRes, logsRes] = await Promise.all([
            apiRequest('/api/admin/system/performance'),
            apiRequest('/api/admin/system/logs')
        ]);
        
        const performance = await performanceRes.json();
        const logs = await logsRes.json();
        
        // 显示系统性能 - 修复数据格式解析
        const performanceDiv = document.getElementById('systemPerformance');
        const systemInfo = performance.system || {};
        const processInfo = performance.process || {};
        const memUsage = processInfo.memoryUsage || {};
        
        // 计算内存使用率
        const memUsagePercent = memUsage.heapTotal ? 
            ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) : '未知';
        
        // 格式化运行时间
        const uptimeHours = systemInfo.uptime ? 
            Math.floor(systemInfo.uptime / 3600) : '未知';
        
        // 格式化CPU负载
        const cpuLoad = systemInfo.loadAverage && systemInfo.loadAverage[0] ? 
            systemInfo.loadAverage[0].toFixed(2) : '未知';
        
        performanceDiv.innerHTML = `
            <p><strong>系统运行时间:</strong> ${uptimeHours}小时</p>
            <p><strong>内存使用率:</strong> ${memUsagePercent}%</p>
            <p><strong>CPU负载:</strong> ${cpuLoad}</p>
            <p><strong>系统平台:</strong> ${systemInfo.platform || '未知'}</p>
            <p><strong>CPU核心数:</strong> ${systemInfo.cpuCount || '未知'}</p>
            <p><strong>Node.js版本:</strong> ${systemInfo.nodeVersion || '未知'}</p>
        `;
        
        // 显示系统日志
        const logsDiv = document.getElementById('systemLogs');
        const logsList = logs.logs || [];
        if (logsList.length > 0) {
            logsDiv.innerHTML = logsList.slice(0, 10).map(log => 
                `<p><small>${new Date(log.timestamp).toLocaleString()}</small> - ${log.message}</p>`
            ).join('');
        } else {
            logsDiv.innerHTML = '<p>暂无日志记录</p>';
        }
        
    } catch (error) {
        console.error('加载系统数据失败:', error);
        document.getElementById('systemPerformance').innerHTML = '<p>系统性能数据加载失败</p>';
        document.getElementById('systemLogs').innerHTML = '<p>系统日志加载失败</p>';
    }
}

// 加载分析数据 - 用简单图表展示，删除团队绩效
async function loadAnalyticsData() {
    try {
        // 获取用户统计数据和总用户数
        const [userActivityRes, usersRes] = await Promise.all([
            apiRequest('/api/admin/analytics/users'),
            apiRequest('/api/admin/users?limit=0')
        ]);
        
        const userActivity = await userActivityRes.json();
        const usersData = await usersRes.json();
        
        // 获取正确的总用户数
        const totalUsers = usersData.total || usersData.users?.length || 0;
        const activeUsers = userActivity.activeUsers || 0;
        const newUsersThisMonth = userActivity.newUsersThisMonth || 0;
        
        // 显示用户活跃度数据 - 用简单条形图表示
        const userChart = document.getElementById('userActivityChart');
        const activePercentage = totalUsers > 0 ? (activeUsers / totalUsers * 100).toFixed(1) : 0;
        
        userChart.innerHTML = `
            <p><strong>总注册用户:</strong> ${totalUsers}</p>
            <p><strong>活跃用户:</strong> ${activeUsers} (${activePercentage}%)</p>
            <p><strong>本月新增:</strong> ${newUsersThisMonth}</p>
            <!-- 简单条形图 -->
            <div style="width:100%; height:20px; background:linear-gradient(to right, #007bff ${activePercentage}%, #e9ecef 0%); border-radius: 10px; margin-top: 10px;"></div>
            <small style="color: #666;">活跃用户占比: ${activePercentage}%</small>
        `;
        
    } catch (error) {
        console.error('加载分析数据失败:', error);
        const userChart = document.getElementById('userActivityChart');
        if (userChart) {
            userChart.innerHTML = '<p>数据加载失败</p>';
        }
    }
}

// 显示模态框
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `<h2>${title}</h2>${content}`;
    modal.style.display = 'block';
}

// 添加用户模态框
function showAddUserModal() {
    const content = `
        <form id="addUserForm">
            <div class="form-group">
                <label for="newUsername">用户名:</label>
                <input type="text" id="newUsername" required>
            </div>
            <div class="form-group">
                <label for="newEmail">邮箱:</label>
                <input type="email" id="newEmail" required>
            </div>
            <div class="form-group">
                <label for="newPassword">密码:</label>
                <input type="password" id="newPassword" required>
            </div>
            <div class="form-group">
                <label for="newRole">角色:</label>
                <select id="newRole">
                    <option value="user">普通用户</option>
                    <option value="admin">管理员</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary">创建用户</button>
        </form>
    `;
    
    showModal('添加用户', content);
    
    document.getElementById('addUserForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const userData = {
            username: document.getElementById('newUsername').value,
            email: document.getElementById('newEmail').value,
            password: document.getElementById('newPassword').value,
            role: document.getElementById('newRole').value
        };
        
        try {
            const response = await apiRequest('/api/admin/users', {
                method: 'POST',
                body: JSON.stringify(userData)
            });
            
            if (response.ok) {
                document.getElementById('modal').style.display = 'none';
                loadUsersData();
                alert('用户创建成功');
            } else {
                const error = await response.json();
                alert('创建失败: ' + error.message);
            }
        } catch (error) {
            console.error('创建用户失败:', error);
            alert('创建失败');
        }
    });
}

// 其他模态框函数...
function showAddTeamModal() {
    const content = `
        <form id="addTeamForm">
            <div class="form-group">
                <label for="newTeamName">团队名称:</label>
                <input type="text" id="newTeamName" required>
            </div>
            <div class="form-group">
                <label for="newTeamDescription">描述:</label>
                <textarea id="newTeamDescription"></textarea>
            </div>
            <button type="submit" class="btn btn-primary">创建团队</button>
        </form>
    `;
    
    showModal('添加团队', content);
    
    document.getElementById('addTeamForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const teamData = {
            name: document.getElementById('newTeamName').value,
            description: document.getElementById('newTeamDescription').value
        };
        
        try {
            const response = await apiRequest('/api/admin/teams', {
                method: 'POST',
                body: JSON.stringify(teamData)
            });
            
            if (response.ok) {
                document.getElementById('modal').style.display = 'none';
                loadTeamsData();
                alert('团队创建成功');
            } else {
                const error = await response.json();
                alert('创建失败: ' + error.message);
            }
        } catch (error) {
            console.error('创建团队失败:', error);
            alert('创建失败');
        }
    });
}

function showAddGroupModal() {
    // 类似的组创建模态框
    alert('组创建功能开发中...');
}

function showSendMessageModal() {
    // 消息发送模态框
    alert('消息发送功能开发中...');
}

// 编辑/删除函数
async function editUser(userId) {
    try {
        const response = await apiRequest(`/api/admin/users/${userId}`);
        if (!response.ok) {
            throw new Error('获取用户信息失败');
        }
        const userData = await response.json();
        const user = userData.user || userData; // 兼容不同的响应格式
        
        const content = `
            <form id="editUserForm">
                <input type="hidden" id="editUserId" value="${userId}">
                <div class="form-group">
                    <label for="editUsername">用户名:</label>
                    <input type="text" id="editUsername" value="${user.username || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editEmail">邮箱:</label>
                    <input type="email" id="editEmail" value="${user.email || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editPassword">新密码 (可选):</label>
                    <input type="password" id="editPassword">
                </div>
                <div class="form-group">
                    <label for="editRole">角色:</label>
                    <select id="editRole">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>
                    </select>
                </div>
                <button type="submit" class="btn btn-primary">更新用户</button>
            </form>
        `;
        
        showModal('编辑用户', content);
        
        document.getElementById('editUserForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userData = {
                username: document.getElementById('editUsername').value,
                email: document.getElementById('editEmail').value,
                role: document.getElementById('editRole').value
            };
            const newPassword = document.getElementById('editPassword').value;
            if (newPassword) {
                userData.password = newPassword;
            }
            
            try {
                const updateRes = await apiRequest(`/api/admin/users/${userId}`, {
                    method: 'PUT',
                    body: JSON.stringify(userData)
                });
                
                if (updateRes.ok) {
                    document.getElementById('modal').style.display = 'none';
                    loadUsersData();
                    alert('用户更新成功');
                } else {
                    const error = await updateRes.json();
                    alert('更新失败: ' + error.message);
                }
            } catch (error) {
                console.error('更新用户失败:', error);
                alert('更新失败');
            }
        });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        alert('获取用户信息失败');
    }
}

// 删除用户函数
async function deleteUser(userId) {
    if (confirm('确定要删除这个用户吗？')) {
        try {
            const response = await apiRequest(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadUsersData();
                alert('用户删除成功');
            } else {
                const error = await response.json();
                alert('删除失败: ' + error.message);
            }
        } catch (error) {
            console.error('删除用户失败:', error);
            alert('删除失败');
        }
    }
}

// 类似地实现其他功能的编辑和删除函数，如editTeam, deleteTeam, viewTask, deleteTask 等
// 对于团队
async function editTeam(teamId) {
    try {
        const response = await apiRequest(`/api/admin/teams/${teamId}`);
        if (!response.ok) {
            throw new Error('获取团队信息失败');
        }
        const teamData = await response.json();
        const team = teamData.team || teamData; // 兼容不同的响应格式
        
        const content = `
            <p>原团队名称: ${team.name || '未知'}</p>
            <form id="editTeamForm">
                <input type="hidden" id="editTeamId" value="${teamId}">
                <div class="form-group">
                    <label for="editTeamName">新团队名称:</label>
                    <input type="text" id="editTeamName" value="${team.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editTeamDescription">描述:</label>
                    <textarea id="editTeamDescription">${team.description || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">更新团队</button>
            </form>
        `;
        
        showModal('编辑团队', content);
        
        document.getElementById('editTeamForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const teamData = {
                name: document.getElementById('editTeamName').value,
                description: document.getElementById('editTeamDescription').value
            };
            
            try {
                const updateRes = await apiRequest(`/api/admin/teams/${teamId}`, {
                    method: 'PUT',
                    body: JSON.stringify(teamData)
                });
                
                if (updateRes.ok) {
                    document.getElementById('modal').style.display = 'none';
                    loadTeamsData();
                    alert('团队更新成功');
                } else {
                    const error = await updateRes.json();
                    alert('更新失败: ' + error.message);
                }
            } catch (error) {
                console.error('更新团队失败:', error);
                alert('更新失败');
            }
        });
    } catch (error) {
        console.error('获取团队信息失败:', error);
        alert('获取团队信息失败');
    }
}

async function deleteTeam(teamId) {
    console.log('deleteTeam called with teamId:', teamId);
    if (confirm('确定要删除这个团队吗？')) {
        try {
            console.log('Sending DELETE request to:', `/api/admin/teams/${teamId}`);
            const response = await apiRequest(`/api/admin/teams/${teamId}`, {
                method: 'DELETE'
            });
            
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (response.ok) {
                loadTeamsData();
                alert('团队删除成功');
            } else {
                const error = await response.json();
                console.error('Delete team error response:', error);
                alert('删除失败: ' + (error.message || error.error || '未知错误'));
            }
        } catch (error) {
            console.error('删除团队失败:', error);
            alert('删除失败: ' + error.message);
        }
    }
}

// 对于任务
async function viewTask(taskId) {
    try {
        const response = await apiRequest(`/api/admin/tasks/${taskId}`);
        const task = await response.json();
        
        const content = `
            <div>
                <h3>任务详情</h3>
                <p><strong>标题:</strong> ${task.title}</p>
                <p><strong>描述:</strong> ${task.description || '-'}</p>
                <p><strong>状态:</strong> ${task.status}</p>
                <p><strong>优先级:</strong> ${task.priority}</p>
                <p><strong>创建者:</strong> ${task.creator?.username || '-'}</p>
                <p><strong>所属团队:</strong> ${task.team?.name || '-'}</p>
            </div>
        `;
        
        showModal('任务详情', content);
    } catch (error) {
        console.error('获取任务详情失败:', error);
        alert('获取任务详情失败');
    }
}

async function deleteTask(taskId) {
    if (confirm('确定要删除这个任务吗？')) {
        try {
            const response = await apiRequest(`/api/admin/tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadTasksData();
                alert('任务删除成功');
            } else {
                const error = await response.json();
                alert('删除失败: ' + error.message);
            }
        } catch (error) {
            console.error('删除任务失败:', error);
            alert('删除失败');
        }
    }
}

// 对于消息
async function viewMessage(messageId) {
    try {
        const response = await apiRequest(`/api/admin/messages/${messageId}`);
        const message = await response.json();
        
        const content = `
            <div>
                <h3>消息详情</h3>
                <p><strong>发送者:</strong> ${message.sender?.username || '-'}</p>
                <p><strong>接收者:</strong> ${message.receiver?.username || '全体'}</p>
                <p><strong>内容:</strong> ${message.content}</p>
                <p><strong>类型:</strong> ${message.type}</p>
                <p><strong>状态:</strong> ${message.status}</p>
            </div>
        `;
        
        showModal('消息详情', content);
    } catch (error) {
        console.error('获取消息详情失败:', error);
        alert('获取消息详情失败');
    }
}

async function deleteMessage(messageId) {
    if (confirm('确定要删除这条消息吗？')) {
        try {
            const response = await apiRequest(`/api/admin/messages/${messageId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadMessagesData();
                alert('消息删除成功');
            } else {
                const error = await response.json();
                alert('删除失败: ' + error.message);
            }
        } catch (error) {
            console.error('删除消息失败:', error);
            alert('删除失败');
        }
    }
}

// 对于组，类似实现 editGroup 和 deleteGroup
async function editGroup(groupId) {
    try {
        const response = await apiRequest(`/api/admin/groups/${groupId}`);
        if (!response.ok) {
            throw new Error('获取组信息失败');
        }
        const groupData = await response.json();
        const group = groupData.group || groupData; // 兼容不同的响应格式
        
        const content = `
            <form id="editGroupForm">
                <input type="hidden" id="editGroupId" value="${groupId}">
                <div class="form-group">
                    <label for="editGroupName">组名称:</label>
                    <input type="text" id="editGroupName" value="${group.name || ''}" required>
                </div>
                <div class="form-group">
                    <label for="editGroupDescription">描述:</label>
                    <textarea id="editGroupDescription">${group.description || ''}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">更新组</button>
            </form>
        `;
        
        showModal('编辑组', content);
        
        document.getElementById('editGroupForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const groupData = {
                name: document.getElementById('editGroupName').value,
                description: document.getElementById('editGroupDescription').value
            };
            
            try {
                const updateRes = await apiRequest(`/api/admin/groups/${groupId}`, {
                    method: 'PUT',
                    body: JSON.stringify(groupData)
                });
                
                if (updateRes.ok) {
                    document.getElementById('modal').style.display = 'none';
                    loadGroupsData();
                    alert('组更新成功');
                } else {
                    const error = await updateRes.json();
                    alert('更新失败: ' + error.message);
                }
            } catch (error) {
                console.error('更新组失败:', error);
                alert('更新失败');
            }
        });
    } catch (error) {
        console.error('获取组信息失败:', error);
        alert('获取组信息失败');
    }
}

async function deleteGroup(groupId) {
    if (confirm('确定要删除这个组吗？')) {
        try {
            const response = await apiRequest(`/api/admin/groups/${groupId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                loadGroupsData();
                alert('组删除成功');
            } else {
                const error = await response.json();
                alert('删除失败: ' + error.message);
            }
        } catch (error) {
            console.error('删除组失败:', error);
            alert('删除失败');
        }
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        window.location.href = '/';
    }
}

// 搜索用户功能
async function searchUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.trim();
    try {
        const url = searchTerm ? `/api/admin/users?search=${encodeURIComponent(searchTerm)}` : '/api/admin/users';
        const response = await apiRequest(url);
        const data = await response.json();
        const users = data.users || [];
        
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user._id}</td>
                <td>${user.username}</td>
                <td>${user.email || '-'}</td>
                <td><span class="status-badge status-${user.role}">${user.role}</span></td>
                <td><span class="status-badge status-${user.isActive ? 'active' : 'inactive'}">${user.isActive ? '活跃' : '非活跃'}</span></td>
                <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editUser('${user._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteUser('${user._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('搜索用户失败:', error);
    }
}

// 搜索团队功能
async function searchTeams() {
    const searchTerm = document.getElementById('teamSearchInput').value.trim();
    try {
        const url = searchTerm ? `/api/admin/teams?search=${encodeURIComponent(searchTerm)}` : '/api/admin/teams';
        const response = await apiRequest(url);
        const data = await response.json();
        const teams = data.teams || [];
        
        const tbody = document.querySelector('#teamsTable tbody');
        tbody.innerHTML = '';
        
        teams.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${team._id}</td>
                <td>${team.name}</td>
                <td>${team.description || '-'}</td>
                <td>${team.owner?.username || '-'}</td>
                <td>${team.memberCount || 0}</td>
                <td>${new Date(team.createdAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-sm btn-primary" onclick="editTeam('${team._id}')">编辑</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteTeam('${team._id}')">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('搜索团队失败:', error);
    }
}

// API请求工具函数
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
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                window.location.href = '/admin';
                return Promise.reject('未授权');
            }
            return response;
        });
}