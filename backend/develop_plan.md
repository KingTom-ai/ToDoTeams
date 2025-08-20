# 后端管理系统开发规划

## 概述
基于当前项目已完成的前端和后端基础功能（包括用户、任务、团队、消息等模块），后端管理系统旨在提供管理员级别的控制和监控能力。管理系统将扩展现有backend架构，添加管理员专用路由、模型扩展和服务。目标是实现对用户、团队、任务的全面管理、数据统计和系统维护功能。开发将使用Node.js、Express框架，与现有数据库（假设使用MongoDB基于models）集成。

## 总体架构
- **技术栈**：Node.js, Express, Mongoose (或Sequelize，根据现有models), JWT认证, RabbitMQ/Redis for caching/messaging (参考现有config).
- **目录结构**：在`manager`文件夹下创建子目录，如`routes`、`controllers`、`services`、`middlewares`，并集成到主backend。
- **安全考虑**：所有接口需管理员角色认证，使用现有middleware/role.js扩展。

## 功能模块

### 1. 用户管理
- **功能点**：
  - 查看用户列表（分页、搜索、过滤）。
  - 用户详情查看（包括关联团队、任务）。
  - 创建/编辑/删除用户（包括密码重置）。
  - 用户角色管理（普通用户、团队管理员、系统管理员）。
  - 登录日志和活动监控。
- **API设计**：
  - GET /admin/users - 获取用户列表。
  - GET /admin/users/:id - 获取用户详情。
  - POST /admin/users - 创建用户。
  - PUT /admin/users/:id - 更新用户。
  - DELETE /admin/users/:id - 删除用户。
- **实现细节**：扩展现有models/User.js，添加admin服务层。

### 2. 团队管理
- **功能点**：
  - 查看团队列表（包括成员数、任务数）。
  - 团队详情（成员列表、关联组、任务）。
  - 创建/编辑/删除团队。
  - 成员添加/移除。
  - 团队权限设置（参考团队权限设置.md）。
  - 团队活动日志。
- **API设计**：
  - GET /admin/teams - 团队列表。
  - GET /admin/teams/:id - 团队详情。
  - POST /admin/teams - 创建团队。
  - PUT /admin/teams/:id - 更新团队。
  - DELETE /admin/teams/:id - 删除团队。
  - POST /admin/teams/:id/members - 添加成员。
- **实现细节**：基于models/Team.js和TeamGroup.js，添加清理脚本集成（如cleanup_teams.js）。

### 3. 任务管理
- **功能点**：
  - 查看所有任务列表（跨团队、状态过滤）。
  - 任务详情（分配者、执行者、进度、附件）。
  - 强制编辑/删除任务。
  - 任务统计（完成率、逾期率）。
  - 批量操作（状态更新、重新分配）。
- **API设计**：
  - GET /admin/tasks - 任务列表。
  - GET /admin/tasks/:id - 任务详情。
  - PUT /admin/tasks/:id - 更新任务。
  - DELETE /admin/tasks/:id - 删除任务。
  - GET /admin/tasks/stats - 任务统计。
- **实现细节**：扩展models/Task.js，集成测试（如tests/tasks.test.js）。

### 4. 消息中心管理
- **功能点**：
  - 查看所有消息（系统消息、团队消息）。
  - 发送系统广播消息。
  - 消息审核/删除。
  - 消息统计（发送量、阅读率）。
- **API设计**：
  - GET /admin/messages - 消息列表。
  - POST /admin/messages/broadcast - 发送广播。
  - DELETE /admin/messages/:id - 删除消息。
- **实现细节**：基于models/Message.js和services/messageService.js。

### 5. 组和团队组管理
- **功能点**：
  - 查看/创建/编辑/删除组（Group.js）。
  - 管理团队组关联（TeamGroup.js）。
  - 组权限控制。
- **API设计**：
  - GET /admin/groups - 组列表。
  - POST /admin/groups - 创建组。
  - Similar for teamgroups.

### 6. 系统维护
- **功能点**：
  - 数据备份/恢复。
  - 系统日志查看。
  - 配置管理（.env, keys）。
  - 性能监控（Redis/RabbitMQ状态）。
  - 清理无用数据（参考cleanup_teams.js）。
- **API设计**：专用维护路由。

### 7. 统计和报告
- **功能点**：
  - 用户活跃度报告。
  - 团队绩效报告。
  - 任务完成趋势图。
  - 导出报告（CSV/PDF）。

## 开发计划
- **阶段1**：需求分析和架构设计（1周）。
- **阶段2**：核心模块开发（用户、团队、任务，2周）。
- **阶段3**：辅助模块（消息、组、维护，1周）。
- **阶段4**：测试和优化（包括单元测试扩展现有jest.config.js，1周）。
- **阶段5**：集成到主backend并部署。

## 注意事项
- 确保与现有routes集成，避免冲突。
- 添加详细日志和错误处理。
- 遵循现有代码风格和安全最佳实践。