import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Request interceptor to add token and set Content-Type
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Only set Content-Type to application/json if it's not FormData
    // FormData needs to set its own Content-Type with boundary
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: async () => {
    // Get refresh token before clearing storage
    const refreshToken = localStorage.getItem('refreshToken');

    // Call backend logout endpoint to revoke refresh token
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (error) {
        console.error('Error revoking refresh token:', error);
        // Continue with local logout even if backend call fails
      }
    }

    // Clear local storage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    return Promise.resolve();
  },
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) =>
    api.post('/auth/reset-password', { token, password }),
  verifyEmail: (token) => api.get(`/auth/verify-email/${token}`),
};

// Tasks API
export const tasksAPI = {
  getAll: () => api.get('/tasks'),
  getOne: (id) => api.get(`/tasks/${id}`),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.put(`/tasks/${id}`, data),
  toggle: (id) => api.patch(`/tasks/${id}/toggle`),
  updatePomodoro: (id, count) => api.patch(`/tasks/${id}/pomodoro`, { count }),
  planToday: (id) => api.patch(`/tasks/${id}/plan-today`),
  unplan: (id) => api.patch(`/tasks/${id}/unplan`),
  addTime: (id, minutes) => api.patch(`/tasks/${id}/add-time`, { minutes }),
  delete: (id) => api.delete(`/tasks/${id}`),
};

// Admin API
export const adminAPI = {
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),
  testEmail: (email) => api.post('/admin/test-email', { email }),
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
};

// Inbox API
export const inboxAPI = {
  getAll: (status = 'active') => api.get(`/inbox?status=${status}`),
  create: (data) => api.post('/inbox', data),
  update: (id, data) => api.put(`/inbox/${id}`, data),
  delete: (id) => api.delete(`/inbox/${id}`),
  convertToTasks: (id, tasks) => api.post(`/inbox/${id}/convert-to-tasks`, { tasks }),
  convertToMemo: (id, memo) => api.post(`/inbox/${id}/convert-to-memo`, memo),
  delay: (id, delayUntil) => api.post(`/inbox/${id}/delay`, { delayUntil }),
  transcribe: (formData) => api.post('/inbox/transcribe', formData),
};

// Memos API
export const memosAPI = {
  getAll: () => api.get('/memos'),
  getOne: (id) => api.get(`/memos/${id}`),
  create: (data) => api.post('/memos', data),
  update: (id, data) => api.put(`/memos/${id}`, data),
  delete: (id) => api.delete(`/memos/${id}`),
};

// Tags API
export const tagsAPI = {
  getAll: () => api.get('/tags'),
  create: (data) => api.post('/tags', data),
  update: (id, data) => api.put(`/tags/${id}`, data),
  delete: (id) => api.delete(`/tags/${id}`),
};

export default api;