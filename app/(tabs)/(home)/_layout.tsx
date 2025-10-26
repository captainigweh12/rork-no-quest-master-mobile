import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeStackLayout() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      console.log('User not authenticated, redirecting to auth');
      router.replace('/auth');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1a1f3a', '#2d3561']}
          style={styles.gradient}
        >
          <ActivityIndicator size="large" color="#ff8a4c" />
        </LinearGradient>
      </View>
    );
  }

  if (!user) {
    return null;
  }

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
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
