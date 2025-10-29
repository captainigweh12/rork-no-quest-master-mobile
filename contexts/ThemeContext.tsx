import AsyncStorage from '@react-native-async-storage/async-storage';
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
  };
}

const lightTheme: Theme = {
  mode: 'light',
  colors: {
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',
    text: '#0F172A',
    textSecondary: '#64748B',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#E2E8F0',
    card: '#FFFFFF',
    shadow: '#00000010',
  },
};

const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    background: '#0f1419',
    backgroundSecondary: '#1e293b',
    backgroundTertiary: '#1a1a2e',
    text: '#FFFFFF',
    textSecondary: '#94A3B8',
    primary: '#8B5CF6',
    secondary: '#EC4899',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    border: '#334155',
    card: '#1e293b',
    shadow: '#00000040',
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
        const savedTheme = await AsyncStorage.getItem('theme');
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
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  }, [themeMode]);

  const setTheme = useCallback(async (mode: ThemeMode) => {
    setThemeMode(mode);
    try {
      await AsyncStorage.setItem('theme', mode);
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
