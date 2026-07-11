import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

// Attach JWT token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('scm_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('scm_token');
      localStorage.removeItem('scm_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

// Products
export const productsAPI = {
  getAll: () => API.get('/products'),
  getById: (id) => API.get(`/products/${id}`),
  create: (data) => API.post('/products', data),
  update: (id, data) => API.put(`/products/${id}`, data),
  delete: (id) => API.delete(`/products/${id}`),
};

// Materials
export const materialsAPI = {
  getAll: () => API.get('/materials'),
  getById: (id) => API.get(`/materials/${id}`),
  create: (data) => API.post('/materials', data),
  update: (id, data) => API.put(`/materials/${id}`, data),
  updateStock: (id, data) => API.patch(`/materials/${id}/stock`, data),
  delete: (id) => API.delete(`/materials/${id}`),
};

// Usage
export const usageAPI = {
  getByMaterial: (materialId, params) => API.get(`/usage/${materialId}`, { params }),
  logUsage: (data) => API.post('/usage', data),
  uploadFile: (materialId, formData) => API.post(`/usage/upload/${materialId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Predictions
export const predictionsAPI = {
  getAll: () => API.get('/predictions'),
  generate: (materialId) => API.post(`/predictions/generate/${materialId}`),
};

// Calendar
export const calendarAPI = {
  getEvents: (params) => API.get('/calendar', { params }),
  createEvent: (data) => API.post('/calendar', data),
  updateEvent: (id, data) => API.put(`/calendar/${id}`, data),
  deleteEvent: (id) => API.delete(`/calendar/${id}`),
};

export default API;
