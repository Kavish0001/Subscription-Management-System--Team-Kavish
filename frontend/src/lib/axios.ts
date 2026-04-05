import axios from 'axios';

const api = axios.create({
  baseURL: (import.meta as any).env.VITE_API_URL ?? 'http://localhost:4000',
  withCredentials: true,
});

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    
    // Ignore explicit auth endpoints
    if (original.url?.includes('/auth/login') || original.url?.includes('/auth/refresh')) {
      throw error;
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push((token) => {
            if (token) {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }
      
      original._retry = true;
      isRefreshing = true;
      
      try {
        const { data } = await axios.post(
          `${(import.meta as any).env.VITE_API_URL ?? 'http://localhost:4000'}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        localStorage.setItem('accessToken', data.accessToken);
        queue.forEach((cb) => cb(data.accessToken));
        queue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        isRefreshing = false;
        return api(original);
      } catch (refreshError) {
        console.error('Session refresh failed', refreshError);
        queue.forEach((cb) => cb(null));
        queue = [];
        localStorage.removeItem('accessToken');
        globalThis.location.href = '/login';
        // Note: intentionally leaving 'isRefreshing = true' to silently stall any remaining parallel queries while the browser unloads
        throw error;
      }
    }
    throw error;
  }
);

export default api;
