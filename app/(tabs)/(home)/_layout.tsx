import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomeStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="category/[category]" />
    </Stack>
  );
}
