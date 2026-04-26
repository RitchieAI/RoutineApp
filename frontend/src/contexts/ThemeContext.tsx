import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const lightColors = {
  bg: '#FAFAF9',
  surface: '#F5F5F4',
  surfaceElevated: '#ECEBEA',
  primary: '#4F46E5',
  primaryMuted: '#E0E7FF',
  text: '#1C1C1E',
  textMuted: '#78716C',
  border: '#E7E5E4',
  success: '#059669',
  successMuted: '#ECFDF5',
  error: '#DC2626',
  errorMuted: '#FEF2F2',
  overlay: 'rgba(0, 0, 0, 0.35)',
  white: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0.04)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E7E5E4',
};

export const darkColors = {
  bg: '#09090B',
  surface: '#18181B',
  surfaceElevated: '#27272A',
  primary: '#818CF8',
  primaryMuted: '#1E1B4B',
  text: '#FAFAFA',
  textMuted: '#A1A1AA',
  border: '#27272A',
  success: '#34D399',
  successMuted: '#064E3B',
  error: '#F87171',
  errorMuted: '#450A0A',
  overlay: 'rgba(0, 0, 0, 0.6)',
  white: '#FFFFFF',
  cardShadow: 'rgba(0, 0, 0, 0)',
  tabBar: '#111113',
  tabBarBorder: '#27272A',
};

type ThemeMode = 'light' | 'dark' | 'system';
type CheckboxPosition = 'left' | 'right';
type Colors = typeof lightColors;

interface ThemeContextType {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  checkboxPosition: CheckboxPosition;
  setCheckboxPosition: (position: CheckboxPosition) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
  checkboxPosition: 'left',
  setCheckboxPosition: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [checkboxPosition, setCheckboxPositionState] = useState<CheckboxPosition>('left');
  const systemScheme = useColorScheme();

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    AsyncStorage.getItem('theme_mode').then((stored) => {
      if (stored && ['light', 'dark', 'system'].includes(stored)) {
        setModeState(stored as ThemeMode);
      }
    });
    AsyncStorage.getItem('checkbox_position').then((stored) => {
      if (stored && ['left', 'right'].includes(stored)) {
        setCheckboxPositionState(stored as CheckboxPosition);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_mode', newMode);
  };

  const setCheckboxPosition = (position: CheckboxPosition) => {
    setCheckboxPositionState(position);
    AsyncStorage.setItem('checkbox_position', position);
  };

  return (
    <ThemeContext.Provider value={{ mode, colors, isDark, setMode, checkboxPosition, setCheckboxPosition }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
