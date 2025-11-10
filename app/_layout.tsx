import { Stack } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { LogBox } from 'react-native';
import React from "react";

function OptionalRorkDev({ children }: { children: React.ReactNode }) {
  const Wrapper = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require('@rork-ai/toolkit-dev-sdk');
      return mod.RorkDevWrapper ?? ((p: any) => p.children);
    } catch {
      return (p: any) => p.children;
    }
  }, []);
  return <Wrapper>{children}</Wrapper>;
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
