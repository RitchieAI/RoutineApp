import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../utils/api';

interface User {
  id: string;
  email: string;
  name: string;
  preferred_language: string;
  theme_mode: string;
  notifications_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleLogin: () => Promise<void>;
  processGoogleSession: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  googleLogin: async () => {},
  processGoogleSession: async () => {},
});

const EMERGENT_AUTH_URL = 'https://auth.emergentagent.com/';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        const data = await api('/api/auth/me');
        setUser(data);
      }
    } catch {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('refresh_token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const processGoogleSession = async (sessionId: string) => {
    const data = await api('/api/auth/google-callback', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
    await AsyncStorage.setItem('access_token', data.access_token);
    await AsyncStorage.setItem('refresh_token', data.refresh_token);
    setUser(data.user);
  };

  const googleLogin = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = window.location.origin + '/auth-callback';
      window.location.href = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
    } else {
      // Native: use expo-web-browser
      const redirectUrl = Linking.createURL('auth-callback');
      const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);

      if (result.type === 'success' && result.url) {
        const hashPart = result.url.split('#')[1] || '';
        const params = new URLSearchParams(hashPart);
        const sessionId = params.get('session_id');
        if (sessionId) {
          await processGoogleSession(sessionId);
        }
      }
    }
  };

  const logout = async () => {
    try {
      await api('/api/auth/logout', { method: 'POST' });
    } catch {}
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api('/api/auth/me');
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, googleLogin, processGoogleSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
