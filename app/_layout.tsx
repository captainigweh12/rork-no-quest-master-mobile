// template
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox, Pressable, View, Text } from "react-native";
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { trpc, trpcClient } from "@/lib/trpc";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { LocalizationProvider } from "@/contexts/LocalizationContext";
import { JournalsProvider } from "@/contexts/JournalsContext";
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { SchemaProvider } from '@/contexts/SchemaContext';
import MigrationBanner from '@/components/MigrationBanner';
import { YouTubeProvider } from '@/contexts/YouTubeContext';
import { StreamProvider } from '@/contexts/StreamContext';
import { ChevronLeft } from 'lucide-react-native';

// NEW: ensure base URL override loads before first network call
import { loadBaseUrlOverride } from "@/lib/baseUrl";
import { getBaseUrl } from "@/lib/baseUrl";

LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
]);

SplashScreen.preventAutoHideAsync();

// --- NEW: Small gate that blocks initial render until we load any saved URL override
function BaseUrlBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadBaseUrlOverride(); // pulls override from AsyncStorage (if any) into memory
      } catch (e) {
        console.warn("[baseUrl] override load failed:", e);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!ready) {
    // keep splash visible while we load; you can render a tiny placeholder if you want
    return null;
  }
  return <>{children}</>;
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const { prefs, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useRef<{ lastRoute: string | null }>({ lastRoute: null });
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
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
  }, [isHydrated, session, segments, isLoading, onboardingLoading, prefs.completed, router]);

  useEffect(() => {
    if (!isLoading && !onboardingLoading && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, onboardingLoading, isHydrated]);

  return (
    <>
      {__DEV__ && (
        <View style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#FFE8D9' }}>
          <Text style={{ color: '#5C2D0C', fontSize: 12 }}>
            tRPC Base: {getBaseUrl()}/api/trpc
          </Text>
        </View>
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen 
          name="settings" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Settings',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-settings">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="profile" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Profile',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-profile">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="account" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Account',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-account">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="create-quest" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Create Quest',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-create-quest">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="disclaimer" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Disclaimer',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-disclaimer">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="notifications" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Notifications',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-notifications">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="chat" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Chat',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-chat">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="subscription" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Subscription',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-subscription">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="manage-categories" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'Manage Categories',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-manage-categories">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="stream" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </>
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
    <BaseUrlBootstrap>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <SchemaProvider>
              <SubscriptionProvider>
                <LocalizationProvider>
                  <ThemeProvider>
                    <OnboardingProvider>
                      <NotificationsProvider>
                        <GameProvider>
                          <JournalsProvider>
                            <CategoriesProvider>
                              <GestureHandlerRootView style={{ flex: 1 }}>
                                <MigrationBanner />
                                <YouTubeProvider>
                                  <StreamProvider>
                                    <RootLayoutNav />
                                  </StreamProvider>
                                </YouTubeProvider>
                              </GestureHandlerRootView>
                            </CategoriesProvider>
                          </JournalsProvider>
                        </GameProvider>
                      </NotificationsProvider>
                    </OnboardingProvider>
                  </ThemeProvider>
                </LocalizationProvider>
              </SubscriptionProvider>
            </SchemaProvider>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </BaseUrlBootstrap>
  );
}
