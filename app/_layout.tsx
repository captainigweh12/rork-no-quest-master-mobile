import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, Platform } from 'react-native';

/**
 * Safe wrapper for Rork Dev SDK.
 * It loads dynamically and silently no-ops if unavailable (Expo Go safe).
 */
function OptionalRorkDev({ children }: { children: React.ReactNode }) {
  const [Wrapper, setWrapper] = useState<React.ComponentType<{ children: React.ReactNode }> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Only attempt to import when not in Expo Go web environment
        if (Platform.OS !== 'web') {
          const mod = await import('@rork-ai/toolkit-dev-sdk');
          if (active && mod?.RorkDevWrapper) setWrapper(() => mod.RorkDevWrapper);
        }
      } catch {
        // fail silently
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const SafeWrapper = Wrapper ?? ((p: any) => p.children);
  return <SafeWrapper>{children}</SafeWrapper>;
}

export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      'Require cycle:',
      'AsyncStorage has been extracted',
    ]);
  }, []);

  return (
    <OptionalRorkDev>
      <Stack
        screenOptions={{
          headerShown: true,
          animation: 'fade',
        }}
      />
    </OptionalRorkDev>
  );
}
