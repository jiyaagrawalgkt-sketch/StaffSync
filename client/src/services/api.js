import axios from 'axios';

// In development the Vite proxy forwards "/api" to the backend, so no configuration is needed.
// In production, set VITE_API_URL to the full API address.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send the HttpOnly auth cookie
  headers: { 'X-Requested-With': 'StaffSync' }, // CSRF defence, checked by the server
});

// If any (non-auth) call returns 401 the session has ended: tell the app to log out.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// Removes empty filter values so we never send "?department=" to the server.
export const clean = (params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null));

export default api;
