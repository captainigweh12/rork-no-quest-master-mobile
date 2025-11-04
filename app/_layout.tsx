// template
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState, useRef } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox, Pressable, View, Text } from "react-native";
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
import { ChevronLeft } from 'lucide-react-native';
import TrpcProvider from "@/providers/TrpcProvider";

// NEW: ensure base URL override loads before first network call
import { loadBaseUrlOverride, getBaseUrl, setBaseUrlOverride } from "@/lib/baseUrl";
import AsyncStorage from '@react-native-async-storage/async-storage';

LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
]);

SplashScreen.preventAutoHideAsync();

function BaseUrlBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const timeout = setTimeout(() => {
      if (mounted) {
        console.warn("[baseUrl] Bootstrap timeout, proceeding anyway");
        setReady(true);
      }
    }, 5000);

    (async () => {
      try {
        console.log("[baseUrl] Loading URL override from storage...");
        
        // Check if there's a bad cached URL
        const currentOverride = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
        console.log("[baseUrl] Current cached override:", currentOverride);
        
        // If it contains rorktest.dev, clear it immediately and set the correct Render URL
        if (currentOverride?.includes('rorktest.dev')) {
          console.log('[baseUrl] ⚠️ Detected old rorktest.dev URL, clearing and setting Render URL...');
          await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
          (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
          
          // Set the correct Render URL
          const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';
          await setBaseUrlOverride(RENDER_URL);
          console.log('[baseUrl] ✅ Set new URL:', RENDER_URL);
        }
        
        const override = await loadBaseUrlOverride();
        console.log("[baseUrl] Override loaded:", override || "none");
        console.log("[baseUrl] Final base URL:", getBaseUrl());
      } catch (e) {
        console.error("[baseUrl] Override load failed:", e);
      } finally {
        clearTimeout(timeout);
        if (mounted) setReady(true);
      }
    })();
    
    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, []);

  if (!ready) {
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
      <TrpcProvider>
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
      </TrpcProvider>
    </BaseUrlBootstrap>
  );
}
