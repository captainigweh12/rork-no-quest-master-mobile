import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox } from 'react-native';


export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      'Require cycle:',
      'AsyncStorage has been extracted',
    ]);
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        animation: 'fade',
      }}
    />
  );
}
