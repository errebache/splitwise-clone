import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }

    if (error.code === 'ERR_NETWORK') {
      console.warn('Network error - backend may not be running');
    }

    return Promise.reject(error);
  }
);

// --------------------- Auth API ---------------------
export const authAPI = {
  register: (data: { email: string; password: string; full_name: string }) =>
    api.post('/auth/register', data),

  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),

  getProfile: () => api.get('/auth/me'),

  updateProfile: (data: { full_name?: string; avatar_url?: string }) =>
    api.put('/auth/profile', data),
};

// --------------------- Groups API ---------------------
export const groupsAPI = {
  getAll: () => api.get('/groups'),

  getById: (id: string) => api.get(`/groups/${id}`),

  create: (data: { name: string; description?: string; currency?: string }) =>
    api.post('/groups', data),

  update: (id: string, data: { name?: string; description?: string; currency?: string }) =>
    api.put(`/groups/${id}`, data),

  delete: (id: string) => api.delete(`/groups/${id}`),

  // ✅ Modifié pour supporter le nom temporaire et téléphone
  addMember: (
    id: string,
    data: { email: string; temporary_name?: string; phone?: string }
  ) => api.post(`/groups/${id}/members`, data),

  removeMember: (id: string, userId: string) =>
    api.delete(`/groups/${id}/members/${userId}`),

  getAllMembers: (id: string) => api.get(`/groups/${id}/all-members`),

  getWithMembers: () => api.get('/groups/with-members'),

};

// --------------------- Expenses API ---------------------
export const expensesAPI = {
  getByGroup: (groupId: string) =>
    api.get(`/expenses/group/${groupId}`)
      .then(response => {
        console.log('API response for expenses:', response);
        return response;
      })
      .catch(error => {
        console.error('API error for expenses:', error);
        throw error;
      }),

  create: (data: any) => api.post('/expenses', data),

  update: (id: string, data: any) => api.put(`/expenses/${id}`, data),

  delete: (id: string) => api.delete(`/expenses/${id}`),

  getBalances: (groupId: string) =>
    api.get(`/expenses/group/${groupId}/balances`),
};

// --------------------- Payments API ---------------------
export const paymentsAPI = {
  getAll: () => api.get('/payments'),

  create: (data: { amount: number; currency: string; method: string; description?: string }) =>
    api.post('/payments', data),

  getRefunds: () => api.get('/payments/refunds'),

  createRefund: (data: { amount: number; currency: string; reason: string; description?: string; payment_id?: number }) =>
    api.post('/payments/refunds', data),

  updateRefund: (id: string, data: { status: string }) =>
    api.put(`/payments/refunds/${id}`, data),
};

// --------------------- Analytics API ---------------------
export const analyticsAPI = {
  getOverview: () => api.get('/analytics/overview'),

  getExpensesByCategory: () => api.get('/analytics/expenses-by-category'),

  getMonthlyTrends: () => api.get('/analytics/monthly-trends'),

  getTopSpenders: () => api.get('/analytics/top-spenders'),

  getGroupAnalytics: (groupId: string) =>
    api.get(`/analytics/groups/${groupId}`),
};

// --------------------- Invitations API ---------------------
export const invitationsAPI = {
  generateInvitation: (groupId: string, data: { maxUses?: number; expiresInDays?: number }) =>
    api.post(`/invitations/groups/${groupId}/generate`, data),

  addParticipant: (groupId: string, data: { name: string; email?: string; phone?: string }) =>
    api.post(`/invitations/groups/${groupId}/participants`, data),

  getParticipants: (groupId: string) =>
    api.get(`/invitations/groups/${groupId}/participants`),

  joinByToken: (token: string) => api.get(`/invitations/join/${token}`),

  joinByCode: (code: string) =>
    api.post('/invitations/join-by-code', { code }),

  acceptInvitation: (groupId: string, data: { invitationCode?: string; participantId?: string }) =>
    api.post(`/invitations/accept/${groupId}`, data),

  sendEmailInvitation: (groupId: string, data: { email: string; name: string }) =>
    api.post(`/invitations/groups/${groupId}/invite-email`, data),
};

export default api;
