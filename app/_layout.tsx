// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { trpc, trpcClient } from "@/lib/trpc";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { JournalsProvider } from "@/contexts/JournalsContext";
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';


LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
]);

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const { prefs, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useRef<{ lastRoute: string | null }>({ lastRoute: null });

  useEffect(() => {
    if (isLoading || onboardingLoading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboarding = segments[0] === 'onboarding';

    let targetRoute: string | null = null;

    if (!session && !inAuthGroup) {
      targetRoute = '/auth';
    } else if (session && !prefs.completed && !inOnboarding) {
      targetRoute = '/onboarding';
    } else if (session && prefs.completed && (inAuthGroup || inOnboarding)) {
      targetRoute = '/(tabs)/(home)';
    }

    if (targetRoute && navigationRef.current.lastRoute !== targetRoute) {
      navigationRef.current.lastRoute = targetRoute;
      router.replace(targetRoute as any);
    }
  }, [session, segments, isLoading, onboardingLoading, prefs.completed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync();
    }, 100);

    if (!isLoading && !onboardingLoading) {
      clearTimeout(timer);
      SplashScreen.hideAsync();
    }

    return () => clearTimeout(timer);
  }, [isLoading, onboardingLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      <Stack.Screen name="profile" options={{ presentation: "modal" }} />
      <Stack.Screen name="create-quest" options={{ presentation: "modal" }} />
      <Stack.Screen name="disclaimer" options={{ presentation: "modal" }} />
      <Stack.Screen name="notifications" options={{ presentation: "modal" }} />
      <Stack.Screen name="chat" options={{ presentation: "modal" }} />
      <Stack.Screen name="subscription" options={{ presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SubscriptionProvider>
            <LocalizationProvider>
              <ThemeProvider>
                <OnboardingProvider>
                  <NotificationsProvider>
                    <GameProvider>
                      <JournalsProvider>
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <RootLayoutNav />
                        </GestureHandlerRootView>
                      </JournalsProvider>
                    </GameProvider>
                  </NotificationsProvider>
                </OnboardingProvider>
              </ThemeProvider>
            </LocalizationProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
