import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let apiClient: AxiosInstance;
let token: string | null = null;
let refreshToken: string | null = null;
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function createAxiosInstance() {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const requestId = crypto.randomUUID?.() || Math.random().toString(36);
    config.headers['X-Request-Id'] = requestId;
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (error.response?.status === 401 && !originalRequest._retry) {
        if (isRefreshing) {
          return new Promise((resolve) => {
            addRefreshSubscriber((newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(instance(originalRequest));
            });
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/api/auth/refresh`, {
              refreshToken,
            });

            const newAccessToken = response.data.accessToken;
            token = newAccessToken;
            localStorage.setItem('token', newAccessToken);

            instance.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

            isRefreshing = false;
            onRefreshed(newAccessToken);

            return instance(originalRequest);
          }
        } catch (refreshError) {
          isRefreshing = false;
          // Refresh failed, clear auth and redirect to login
          token = null;
          refreshToken = null;
          localStorage.removeItem('token');
          localStorage.removeItem('refresh-token');
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
          return Promise.reject(refreshError);
        }
      }

      if (error.response?.status === 401) {
        token = null;
        refreshToken = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('refresh-token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

apiClient = createAxiosInstance();

export function setToken(newToken: string | null) {
  token = newToken;
  if (newToken) {
    localStorage.setItem('token', newToken);
  } else {
    localStorage.removeItem('token');
  }
}

export function setRefreshToken(newRefreshToken: string | null) {
  refreshToken = newRefreshToken;
  if (newRefreshToken) {
    localStorage.setItem('refresh-token', newRefreshToken);
  } else {
    localStorage.removeItem('refresh-token');
  }
}

export function getToken() {
  return token;
}

export function getRefreshToken() {
  return refreshToken;
}

export function initializeToken() {
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refresh-token');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
  }
}

export const api = apiClient;

// Auth endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refreshToken }),
  getMe: () => api.get('/api/auth/me'),
  logout: () => api.post('/api/auth/logout'),
};

// Products endpoints
export const productsAPI = {
  list: (page = 1, limit = 10, search?: string) =>
    api.get('/api/products', { params: { page, limit, search } }),
  get: (id: number) => api.get(`/api/products/${id}`),
  create: (data: any) => api.post('/api/products', data),
  update: (id: number, data: any) => api.put(`/api/products/${id}`, data),
  delete: (id: number) => api.delete(`/api/products/${id}`),
  adjustStock: (id: number, data: any) =>
    api.post(`/api/products/${id}/stock-adjustments`, data),
  getStockMovements: (id: number, page = 1, limit = 10) =>
    api.get(`/api/products/${id}/stock-movements`, { params: { page, limit } }),
};

// Customers endpoints
export const customersAPI = {
  list: (page = 1, limit = 10, search?: string) =>
    api.get('/api/customers', { params: { page, limit, search } }),
  get: (id: string) => api.get(`/api/customers/${id}`),
  create: (data: any) => api.post('/api/customers', data),
  update: (id: string, data: any) => api.put(`/api/customers/${id}`, data),
  delete: (id: string) => api.delete(`/api/customers/${id}`),
};

// Orders endpoints
export const ordersAPI = {
  list: (page = 1, limit = 10, status?: string, customerId?: string) =>
    api.get('/api/orders', { params: { page, limit, status, customerId } }),
  get: (id: number) => api.get(`/api/orders/${id}`),
  create: (data: any, idempotencyKey?: string) =>
    api.post('/api/orders', data, {
      headers: { 'Idempotency-Key': idempotencyKey || crypto.randomUUID?.() },
    }),
  pay: (id: number) => api.post(`/api/orders/${id}/pay`),
  ship: (id: number) => api.post(`/api/orders/${id}/ship`),
  complete: (id: number) => api.post(`/api/orders/${id}/complete`),
  cancel: (id: number, reason: string) =>
    api.post(`/api/orders/${id}/cancel`, { cancel_reason: reason }),
};

// Reports endpoints
export const reportsAPI = {
  sales: (from: string, to: string, groupBy = 'day') =>
    api.get('/api/reports/sales', { params: { from, to, group_by: groupBy } }),
  topProducts: (from: string, to: string, limit = 10) =>
    api.get('/api/reports/top-products', { params: { from, to, limit } }),
  summary: () => api.get('/api/reports/summary'),
};

// Audit endpoints
export const auditAPI = {
  getLogs: (page = 1, limit = 10, action?: string, entityType?: string, userId?: number) =>
    api.get('/api/audit-logs', { params: { page, limit, action, entityType, userId } }),
  getMetrics: () => api.get('/api/audit-logs/metrics'),
  getRedisKeys: () => api.get('/api/audit-logs/redis-keys'),
};

// Health endpoints
export const healthAPI = {
  check: () => api.get('/api/health'),
};
