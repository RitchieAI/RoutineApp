import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export async function api(path: string, options: RequestInit = {}) {
  const token = await AsyncStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          await AsyncStorage.setItem('access_token', data.access_token);
          await AsyncStorage.setItem('refresh_token', data.refresh_token);
          headers['Authorization'] = `Bearer ${data.access_token}`;
          const retryRes = await fetch(`${BASE_URL}${path}`, { ...options, headers });
          if (!retryRes.ok) {
            const err = await retryRes.json().catch(() => ({ detail: 'Request failed' }));
            throw new Error(typeof err.detail === 'string' ? err.detail : JSON.stringify(err.detail));
          }
          return retryRes.json();
        }
      } catch {
        await AsyncStorage.removeItem('access_token');
        await AsyncStorage.removeItem('refresh_token');
      }
    }
    throw new Error('Not authenticated');
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    const detail = error.detail;
    if (typeof detail === 'string') throw new Error(detail);
    if (Array.isArray(detail)) throw new Error(detail.map((e: any) => e.msg || JSON.stringify(e)).join(' '));
    throw new Error(JSON.stringify(detail));
  }

  return res.json();
}
