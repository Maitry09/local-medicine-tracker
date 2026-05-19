import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem('accessToken') || localStorage.getItem('token');

  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }

  return req;
});

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and we haven't tried refreshing yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Don't try to refresh if it's a login or registration request
      if (originalRequest.url?.includes('/auth/login') || 
          originalRequest.url?.includes('/auth/register') ||
          originalRequest.url?.includes('/auth/refresh-token')) {
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
        // keep both keys for compatibility
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Clear tokens and redirect to login
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
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

// extend auth API with forgot/reset
authAPI.forgotPassword = (email) => api.post('/auth/forgot-password', { email });
authAPI.resetPassword = (token, password) => api.post('/auth/reset-password', { token, password });

// Medicine API
export const medicineAPI = {
  search: (params) => api.get('/medicines/search', { params }),
  getAll: (params) => api.get('/medicines/search', { params }),
  getMedicines: (params) => {
    const requestParams = { ...params };
    if (requestParams.search) {
      requestParams.q = requestParams.search;
      delete requestParams.search;
    }
    return api.get('/medicines/search', { params: requestParams });
  },
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
  getStocks: (params) => api.get('/stock', { params }),
  addStock: (data) => api.post('/stock', data),
  add: (data) => api.post('/stock', data),
  updateStock: (id, data) => api.put(`/stock/${id}`, data),
  update: (id, data) => api.put(`/stock/${id}`, data),
  deleteStock: (id) => api.delete(`/stock/${id}`),
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

// Saved medicines
export const savedMedicineAPI = {
  add: (data) => api.post('/saved-medicines', data),
  list: (params) => api.get('/saved-medicines', { params }),
  remove: (id) => api.delete(`/saved-medicines/${id}`)
};

// Reviews
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByPharmacy: (pharmacyId, params) => api.get(`/reviews/pharmacy/${pharmacyId}`, { params }),
  getAll: (params) => api.get('/reviews', { params }),
  getMyReviews: (params) => api.get('/reviews/my-reviews', { params }),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`)
};

// Prescription API
export const prescriptionAPI = {
  upload: (formData) => api.post('/prescriptions/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getPharmacyPrescriptions: () => api.get('/prescriptions/pharmacy'),
  respond: (id, data) => api.post(`/prescriptions/${id}/respond`, data),
  review: (id, data) => api.patch(`/prescriptions/${id}/review`, data),
  getMyPrescriptions: () => api.get('/prescriptions/my'),
  getAdminPrescriptions: () => api.get('/prescriptions/admin'),
  getById: (id) => api.get(`/prescriptions/${id}`)
};

// Order API
export const orderAPI = {
  getMyOrders: (params) => api.get('/orders/my-orders', { params }),
  getById: (id) => api.get(`/orders/${id}`),
  createOrder: (data) => api.post('/orders', data),
  create: (data) => api.post('/orders', data),
  cancelOrder: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
  cancel: (id, reason) => api.patch(`/orders/${id}/cancel`, { reason }),
  getPharmacyOrders: (params) => api.get('/orders/pharmacy/orders', { params }),
  updateOrderStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  updateStatus: (id, data) => api.patch(`/orders/${id}/status`, data),
  updateCODPaymentStatus: (id, paymentStatus) => api.patch(`/orders/${id}/payment-status`, { paymentStatus }),
  getAllOrders: (params) => api.get('/orders/admin/all', { params })
};

// Payment API
export const paymentAPI = {
  createRazorpayOrder: (orderId) => api.post('/payments/razorpay/create-order', { orderId }),
  createOrder: (orderId) => api.post('/payments/create-order', { orderId }),
  verify: (data) => api.post('/payments/verify', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
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
  ,
  createAdmin: (data) => api.post('/admin/admins', data)
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