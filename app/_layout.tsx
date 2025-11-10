import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { LogBox, Platform } from 'react-native';

/**
 * Safe wrapper for Rork Dev SDK.
 * Returns children directly since dev SDK is optional.
 */
function OptionalRorkDev({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
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
