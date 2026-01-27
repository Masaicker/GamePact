import axios from 'axios';
import { useUserStore } from '../stores/user';

// 创建 axios 实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加 token 和禁用缓存
api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore();
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`;
    }
    // 禁用 GET 请求缓存
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _: Date.now(),
      };
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期或无效，登出用户
      const userStore = useUserStore();
      userStore.logout();
    }
    return Promise.reject(error);
  }
);

// ==================== 认证 API ====================

export const authApi = {
  // 注册
  register: (data: { username: string; displayName: string; password: string; inviteCode: string }) =>
    api.post('/auth/register', data),

  // 登录
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),

  // 登出
  logout: () => api.post('/auth/logout'),

  // 获取当前用户信息
  getMe: () => api.get('/auth/me'),

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
};

// ==================== 活动 API ====================

export const sessionsApi = {
  // 获取活动列表
  list: () => api.get('/sessions'),

  // 获取历史活动列表
  listHistory: () => api.get('/sessions/history'),

  // 创建活动
  create: (data: any) => api.post('/sessions', data),

  // 获取活动详情
  get: (id: string) => api.get(`/sessions/${id}`),

  // 更新活动
  update: (id: string, data: any) => api.put(`/sessions/${id}`, data),

  // 删除活动
  delete: (id: string) => api.delete(`/sessions/${id}`),

  // 投票
  vote: (id: string, data: any) => api.post(`/sessions/${id}/vote`, data),

  // 请假
  excuse: (id: string, data: any) => api.post(`/sessions/${id}/excuse`, data),

  // 结算
  settle: (id: string, data: any) => api.put(`/sessions/${id}/settle`, data),

  // 流局
  cancel: (id: string, data: any) => api.put(`/sessions/${id}/cancel`, data),
};

// ==================== 用户 API ====================

export const usersApi = {
  // 获取用户列表（排行榜）
  list: () => api.get('/users'),

  // 获取用户详情
  get: (id: string) => api.get(`/users/${id}`),

  // 获取用户积分历史
  getHistory: (id: string) => api.get(`/users/${id}/history`),
};

// ==================== 管理员 API ====================

export const adminApi = {
  // 获取邀请码列表
  getInvites: () => api.get('/admin/invites'),

  // 生成邀请码
  createInvite: (data?: { count?: number; expiresIn?: number }) =>
    api.post('/admin/invites', data),

  // 删除邀请码
  deleteInvite: (id: string) => api.delete(`/admin/invites/${id}`),

  // 调整用户积分
  adjustScore: (userId: string, data: { scoreChange: number; reason: string }) =>
    api.post(`/admin/users/${userId}/score`, data),

  // 获取审计日志
  getAuditLogs: (params?: { limit?: number; offset?: number }) =>
    api.get('/admin/audit', { params }),

  // 软删除积分记录
  deleteScoreHistory: (id: string) =>
    api.delete(`/admin/score-history/${id}`),

  // 获取用户积分历史
  getUserHistory: (userId: string) =>
    api.get(`/users/${userId}/history`),

  // 删除用户
  deleteUser: (userId: string) =>
    api.delete(`/admin/users/${userId}`),

  // 导出数据
  exportData: (params: { range: string; startDate?: string; endDate?: string }) =>
    api.get('/admin/export', { params }),

  // 重置用户密码
  resetUserPassword: (userId: string, data: { newPassword: string }) =>
    api.post(`/admin/users/${userId}/reset-password`, data),
};

export default api;
