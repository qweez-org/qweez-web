import axios from 'axios';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`;
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json', 'X-Refresh-Cookie': '1' },
  withCredentials: true,
});

const refreshApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json', 'X-Refresh-Cookie': '1' },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const accessToken = localStorage.getItem('qweez_access_token');
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshApi
      .post('/auth/refresh', {})
      .then((res) => {
        const token = res.data?.accessToken as string | undefined;
        if (!token) return null;
        localStorage.setItem('qweez_access_token', token);
        return token;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const url = (original?.url || '') as string;
    if (error.response?.status !== 401 || !original || original.__isRetry) {
      return Promise.reject(error);
    }

    if (url.includes('/auth/refresh') || url.includes('/auth/logout')) {
      return Promise.reject(error);
    }

    original.__isRetry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      localStorage.removeItem('qweez_access_token');
      localStorage.removeItem('qweez_user');
      return Promise.reject(error);
    }

    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  }
);

export default api;
