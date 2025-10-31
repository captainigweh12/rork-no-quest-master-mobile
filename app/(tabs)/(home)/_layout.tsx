import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function HomeStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.background },
        headerTitleStyle: { color: theme.colors.text },
        headerTintColor: theme.colors.text,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="category/[category]" options={{ title: 'Category' }} />
      <Stack.Screen name="live/[id]" options={{ title: 'Live Quest' }} />
    </Stack>
  );
}
