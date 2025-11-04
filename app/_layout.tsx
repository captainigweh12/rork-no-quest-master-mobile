// types for expo-router are declared in app/expo-router.d.ts
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from "@/lib/trpc";
import { httpBatchLink } from "@trpc/client";
import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox, Pressable, View, Text } from "react-native";
import { transformer } from "@/lib/transformer";
import { ChevronLeft } from "lucide-react-native";

if (!process.env.EXPO_PUBLIC_API_URL) {
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});
export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.EXPO_PUBLIC_API_URL}/trpc`,
      async headers() {
        return {};
      },
      transformer
    })
  ]
});

export const client = trpc.createClient({
  links: [
    httpBatchLink({
      url: getBaseUrl(),
      async headers() {
        return {
          // Include any headers needed
        };
      },
      transformer
    })
  ]
});
import { GameProvider } from "@/contexts/GameContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
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
import { VideoSDKContextProvider } from '@/contexts/VideoSDKContext';
import TrpcProvider from "@/providers/TrpcProvider";

// NEW: ensure base URL override loads before first network call
import { loadBaseUrlOverride, getBaseUrl, setBaseUrlOverride } from "@/lib/baseUrl";

LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
]);

SplashScreen.preventAutoHideAsync();

function BaseUrlBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    console.log('[BaseUrlBootstrap] Starting initialization...');
    
    const timeout = setTimeout(() => {
      if (mounted && !ready) {
        console.warn("[baseUrl] Bootstrap timeout after 3s, proceeding anyway");
        setReady(true);
      }
    }, 3000);

    (async () => {
      try {
        console.log("[baseUrl] Loading URL override from storage...");
        const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';

        // Load any existing override using the safe helper (handles missing AsyncStorage)
        const currentOverride = await loadBaseUrlOverride();
        console.log("[baseUrl] Current cached override:", currentOverride || "none");

        // If it contains rorktest.dev, clear it immediately and set the correct Render URL
        if (currentOverride?.includes('rorktest.dev')) {
          console.log('[baseUrl] ⚠️ Detected old rorktest.dev URL, clearing and setting Render URL...');
          await setBaseUrlOverride(RENDER_URL);
          console.log('[baseUrl] ✅ Cleared old URL and set new URL:', RENDER_URL);
        }

        const override = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
        console.log("[baseUrl] Override loaded:", override || "none");

        // If no override is present, proactively set the Render URL so the app uses the deployed backend
        if (!override) {
          console.log('[baseUrl] No override found; proactively setting Render URL override...');
          await setBaseUrlOverride(RENDER_URL);
          console.log('[baseUrl] ✅ Set proactive override to:', RENDER_URL);
        }

        console.log("[baseUrl] Final base URL:", getBaseUrl());
        console.log('[BaseUrlBootstrap] ✅ Initialization complete');
      } catch (e) {
        console.error("[baseUrl] Override load failed:", e);
      } finally {
        clearTimeout(timeout);
        if (mounted) {
          console.log('[BaseUrlBootstrap] Setting ready = true');
          setReady(true);
        }
      }
    })();
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
    console.log('[BaseUrlBootstrap] Not ready yet, returning null');
    return null;
  }
  
  console.log('[BaseUrlBootstrap] Ready, rendering children');
  return <>{children}</>;
}

function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const { prefs, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useRef<{ lastRoute: string | null }>({ lastRoute: null });
  const [isHydrated, setIsHydited] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydited(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      console.log('[APP] Waiting for hydration');
      return;
    }
    if (isLoading || onboardingLoading) {
      console.log('[APP] Waiting for loading to complete:', { isLoading, onboardingLoading });
      return;
    }

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
      console.log('[APP] Navigating to:', targetRoute);
      navigationRef.current.lastRoute = targetRoute;
      router.replace(targetRoute as any);
    }
  }, [isHydrated, session, segments, isLoading, onboardingLoading, prefs.completed, router]);

  useEffect(() => {
    if (!isLoading && !onboardingLoading && isHydrated) {
      SplashScreen.hideAsync();
    }
  }, [isLoading, onboardingLoading, isHydrated]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.warn('[APP] Force hiding splash screen after 10s timeout');
      SplashScreen.hideAsync().catch(() => {});
    }, 10000);
    return () => clearTimeout(timeout);
  }, []);

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
        <Stack.Screen 
          name="stream-videosdk" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="clear-storage" 
          options={({ navigation }) => ({ 
            presentation: "modal", 
            headerShown: true,
            title: 'API Debug',
            headerLeft: () => (
              <Pressable onPress={() => navigation.goBack()} style={{ paddingHorizontal: 8 }} testID="back-clear-storage">
                <ChevronLeft size={22} color="#000" />
              </Pressable>
            ),
          })} 
        />
        <Stack.Screen 
          name="emergency-clear" 
          options={{ headerShown: false }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
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
                                    <VideoSDKContextProvider>
                                      <RootLayoutNav />
                                    </VideoSDKContextProvider>
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
