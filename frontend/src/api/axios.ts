import axios from 'axios';
import { Capacitor } from '@capacitor/core';

/**
 * Resolves the appropriate API base URL dynamically.
 * Priority:
 * 1. import.meta.env.VITE_API_BASE_URL (explicitly configured remote/LAN backend URL)
 * 2. import.meta.env.VITE_API_URL (backward compatibility)
 * 3. Native mobile platform check (Capacitor on physical Android phone / emulator)
 *    Falls back to Android emulator host (http://10.0.2.2:5001/api) or placeholder LAN IP
 * 4. In web browser development:
 *    Defaults to '/api' which Vite proxies to http://localhost:5001.
 */
export const getBaseURL = (): string => {
  // 1. Primary check: VITE_API_BASE_URL
  const customBaseUrl = import.meta.env.VITE_API_BASE_URL;
  if (customBaseUrl && customBaseUrl.trim() !== '') {
    const trimmed = customBaseUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // 2. Secondary check: VITE_API_URL
  const legacyUrl = import.meta.env.VITE_API_URL;
  if (legacyUrl && legacyUrl.trim() !== '' && legacyUrl !== '/api') {
    const trimmed = legacyUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // 3. Native mobile platform check (Capacitor on physical Android phone / emulator)
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    // When running inside Android APK without explicit env, fall back to Android emulator host
    // (10.0.2.2 is Android emulator's alias to host machine localhost)
    return 'http://10.0.2.2:5001/api';
  }

  // 4. In standard web browser, use Vite's configured proxy route
  return '/api';
};

/**
 * Returns the backend root origin (e.g., http://192.168.1.100:5001 or '')
 * for resolving uploads/assets when running on mobile.
 */
export const getBackendOrigin = (): string => {
  const base = getBaseURL();
  if (base.startsWith('http://') || base.startsWith('https://')) {
    try {
      const url = new URL(base);
      return url.origin;
    } catch {
      // ignore
    }
  }
  return '';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('civora_user');
      if (stored) {
        const userData = JSON.parse(stored);
        const token = userData?.token;
        if (token) {
          if (config.headers && typeof (config.headers as any).set === 'function') {
            (config.headers as any).set('Authorization', `Bearer ${token}`);
          } else if (config.headers) {
            (config.headers as any)['Authorization'] = `Bearer ${token}`;
          }
        }
      }
    } catch (error) {
      console.error('Failed to attach auth token in request interceptor:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
