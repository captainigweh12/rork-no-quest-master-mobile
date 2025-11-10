import { storage } from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import type { ThemeMode } from '@/types';

export interface Theme {
  mode: ThemeMode;
  colors: {
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;
    text: string;
    textSecondary: string;
    primary: string;
    secondary: string;
    success: string;
    error: string;
    warning: string;
    border: string;
    card: string;
    shadow: string;
    glass: string;
    glassHeavy: string;
    glow: string;
    accentOrange: string;
    accentViolet: string;
    accentBlue: string;
    surfaceElevated: string;
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#F5F7FA',
    backgroundSecondary: '#FFFFFF',
    backgroundTertiary: '#E8ECF0',
    text: '#1A1F36',
    textSecondary: '#697386',
    primary: '#FF7A3D',
    secondary: '#3D8BFF',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#DFE3E8',
    card: '#FFFFFF',
    shadow: '#1A1F3618',
    glass: 'rgba(255, 255, 255, 0.85)',
    glassHeavy: 'rgba(255, 255, 255, 0.95)',
    glow: 'rgba(255, 122, 61, 0.15)',
    accentOrange: '#FF7A3D',
    accentViolet: '#8B5CF6',
    accentBlue: '#3D8BFF',
    surfaceElevated: '#FAFBFC',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0F1419',
    backgroundSecondary: '#1A1F2E',
    backgroundTertiary: '#242938',
    text: '#FFFFFF',
    textSecondary: '#A0AEC0',
    primary: '#FF7A3D',
    secondary: '#A78BFA',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#FFFFFF12',
    card: '#1E2433',
    shadow: '#00000080',
    glass: 'rgba(30, 36, 51, 0.65)',
    glassHeavy: 'rgba(30, 36, 51, 0.85)',
    glow: 'rgba(255, 122, 61, 0.25)',
    accentOrange: '#FF7A3D',
    accentViolet: '#A78BFA',
    accentBlue: '#60A5FA',
    surfaceElevated: '#252B3D',
  },
};

const defaultThemeContext = {
  theme: darkTheme,
  themeMode: 'dark' as ThemeMode,
  toggleTheme: async () => {},
  setTheme: async (_mode: ThemeMode) => {},
  isLoading: false,
};

export const [ThemeProvider, useTheme] = createContextHook(() => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState<ThemeMode>('dark');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const initTheme = async () => {
      try {
  const savedTheme = await storage.getItem('theme');
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setThemeMode(savedTheme);
        } else if (systemColorScheme) {
          setThemeMode(systemColorScheme);
        }
      } catch (error) {
        console.error('Error loading theme:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initTheme();
  }, [systemColorScheme]);

  const toggleTheme = useCallback(async () => {
    const newTheme: ThemeMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newTheme);
    try {
  await storage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [themeMode]);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
  await storage.setItem('theme', mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, []);

  const theme: Theme = useMemo(
    () => (themeMode === 'dark' ? darkTheme : lightTheme),
    [themeMode]
  );

  return useMemo(
    () => ({
      theme,
      themeMode,
      toggleTheme,
      setTheme,
      isLoading,
    }),
    [theme, themeMode, toggleTheme, setTheme, isLoading]
  );
}, defaultThemeContext);
