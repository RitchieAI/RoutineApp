import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api } from '../utils/api';
import { clearAllLocalData } from '../utils/localStorageUtils';

interface User {
  id: string;
  email: string;
  name: string;
  preferred_language: string;
  theme_mode: string;
  notifications_enabled: boolean;
}

interface GuestUser {
  id: 'guest';
  email: 'guest@local';
  name: 'Guest';
  preferred_language: string;
  theme_mode: string;
  notifications_enabled: boolean;
}

interface AuthContextType {
  user: User | GuestUser | null;
  isGuest: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  guestLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  googleLogin: () => Promise<void>;
  processGoogleSession: (sessionId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isGuest: false,
  loading: true,
  login: async () => {},
  register: async () => {},
  guestLogin: async () => {},
  logout: async () => {},
  refreshUser: async () => {},
  googleLogin: async () => {},
  processGoogleSession: async () => {},
});

const EMERGENT_AUTH_URL = 'https://auth.emergentagent.com/';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
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
      // Check if guest login
      const guestMode = await AsyncStorage.getItem('is_guest');
      if (guestMode === 'true') {
        setIsGuest(true);
        const theme = await AsyncStorage.getItem('theme_mode') || 'light';
        const language = await AsyncStorage.getItem('preferred_language') || 'en';
        setUser({
          id: 'guest',
          email: 'guest@local',
          name: 'Guest',
          preferred_language: language,
          theme_mode: theme,
          notifications_enabled: false,
        });
        setLoading(false);
        return;
      }

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

  const guestLogin = async () => {
    try {
      // Aktiviere Gastmodus
      await AsyncStorage.setItem('is_guest', 'true');
      const theme = await AsyncStorage.getItem('theme_mode') || 'light';
      const language = await AsyncStorage.getItem('preferred_language') || 'en';
      
      setIsGuest(true);
      setUser({
        id: 'guest',
        email: 'guest@local',
        name: 'Guest',
        preferred_language: language,
        theme_mode: theme,
        notifications_enabled: false,
      });
    } catch (error) {
      console.error('Guest login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (!isGuest) {
        await api('/api/auth/logout', { method: 'POST' });
      }
    } catch {}
    
    // Bereinige alle Daten beim Logout
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    await AsyncStorage.removeItem('is_guest');
    
    if (isGuest) {
      await clearAllLocalData();
      setIsGuest(false);
    }
    
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const data = await api('/api/auth/me');
      setUser(data);
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, isGuest, loading, login, register, guestLogin, logout, refreshUser, googleLogin, processGoogleSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
