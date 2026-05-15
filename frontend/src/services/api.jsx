import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      status: response.status,
      url: response.config.url,
      hasData: !!response.data
    });
    return response;
  },
  async (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.response?.data?.message || error.message
    });
    
    const originalRequest = error.config;

    // If 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      if (originalRequest.url?.includes('/auth/refresh-token')) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken
        });

        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Medicine API
export const medicineAPI = {
  search: (params) => api.get('/medicines/search', { params }),
  getById: (id) => api.get(`/medicines/${id}`),
  getAvailability: (id, params) => api.get(`/medicines/${id}/availability`, { params }),
  getCategories: () => api.get('/medicines/categories'),
  create: (data) => api.post('/medicines', data),
  update: (id, data) => api.put(`/medicines/${id}`, data),
  delete: (id) => api.delete(`/medicines/${id}`)
};

// Pharmacy API
export const pharmacyAPI = {
  getAll: (params) => api.get('/pharmacies', { params }),
  getById: (id) => api.get(`/pharmacies/${id}`),
  getStock: (id, params) => api.get(`/pharmacies/${id}/stock`, { params }),
  register: (data) => api.post('/pharmacies/register', data),
  getMyPharmacy: () => api.get('/pharmacies/my/details'),
  getMyPharmacyStock: (params) => api.get('/stock', { params }), // ← ADD THIS
  updateMyPharmacy: (data) => api.put('/pharmacies/my/update', data),
  verify: (id) => api.patch(`/pharmacies/${id}/verify`),
  disable: (id) => api.patch(`/pharmacies/${id}/disable`),
  delete: (id) => api.delete(`/pharmacies/${id}`),
};

// Stock API
export const stockAPI = {
  getMyStock: (params) => api.get('/stock', { params }),
  add: (data) => api.post('/stock', data),
  update: (id, data) => api.put(`/stock/${id}`, data),
  delete: (id) => api.delete(`/stock/${id}`),
  bulkUpdate: (items) => api.post('/stock/bulk', { items })
};

// Alert API
export const alertAPI = {
  getMyAlerts: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  update: (id, data) => api.put(`/alerts/${id}`, data),
  delete: (id) => api.delete(`/alerts/${id}`),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
  getTriggeredCount: () => api.get('/alerts/triggered/count')
};

// Notification API
export const notificationAPI = {
  getMyNotifications: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/mark-all-read'),
  deleteNotification: (id) => api.delete(`/notifications/${id}`),
  sendSmsReminder: (data) => api.post('/notifications/sms', data)
};

// Order API
export const orderAPI = {
  getMyOrders: (params) => api.get('/orders/my', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
  getPharmacyOrders: (params) => api.get('/orders/pharmacy/orders', { params }),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  getAllOrders: (params) => api.get('/orders/admin/all', { params })
};

// Payment API
export const paymentAPI = {
  createOrder: (orderId) => api.post('/payments/create-order', { orderId }),
  verify: (data) => api.post('/payments/verify', data),
  getByOrderId: (orderId) => api.get(`/payments/order/${orderId}`),
  requestRefund: (orderId, reason) => api.post('/payments/refund', { orderId, reason })
};

// Admin API
export const adminAPI = {
  getDashboardStats: () => api.get('/admin/dashboard'),
  getAllPharmacies: (params) => api.get('/admin/pharmacies', { params }),
  updatePharmacy: (id, data) => api.put(`/admin/pharmacies/${id}`, data),
  getAllPayments: (params) => api.get('/admin/payments', { params }),
  getActivityLogs: (params) => api.get('/admin/activity', { params }),
  seedMedicines: () => api.post('/admin/seed-medicines')
};

// User API (Admin)
export const userAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  disable: (id) => api.patch(`/users/${id}/disable`),
  enable: (id) => api.patch(`/users/${id}/enable`),
  delete: (id) => api.delete(`/users/${id}`)
};

export default api;
