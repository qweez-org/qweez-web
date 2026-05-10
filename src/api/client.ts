import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
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
    refreshPromise = api
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
    if (error.response?.status !== 401 || !original || original.__isRetry) {
      return Promise.reject(error);
    }

    original.__isRetry = true;
    const newToken = await refreshAccessToken();
    if (!newToken) {
      localStorage.removeItem('qweez_access_token');
      localStorage.removeItem('qweez_user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    original.headers = original.headers || {};
    original.headers.Authorization = `Bearer ${newToken}`;
    return api.request(original);
  }
);

export default api;
