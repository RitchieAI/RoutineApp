import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceElevated: '#F3F4F6',
  primary: '#0047FF',
  text: '#0A0A0A',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  success: '#00D26A',
  error: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.4)',
  white: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
};

export const darkColors = {
  bg: '#0A0A0A',
  surface: '#121212',
  surfaceElevated: '#1C1C1E',
  primary: '#3B82F6',
  text: '#F9FAFB',
  textMuted: '#A1A1AA',
  border: '#27272A',
  success: '#00D26A',
  error: '#EF4444',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0)',
};

type ThemeMode = 'light' | 'dark' | 'system';
type Colors = typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const systemScheme = useColorScheme();

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((stored) => {
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setModeState(stored as ThemeMode);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_mode', newMode);
  };

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
