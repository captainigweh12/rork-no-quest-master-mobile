import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox, Pressable, View, Text } from "react-native";
import { ChevronLeft } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

import { YouTubeProvider } from '@/contexts/YouTubeContext';
import { StreamProvider } from '@/contexts/StreamContext';
import { VideoSDKContextProvider } from '@/contexts/VideoSDKContext';
import TrpcProvider from "@/providers/TrpcProvider";
import { getBaseUrl } from "@/lib/baseUrl";
import { localStorageService } from "@/lib/localStorage";
import { useAppInit } from "@/hooks/useAppInit";

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
  const [isHydrated, setIsHydited] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydited(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorageService.seedDemoUsersIfNeeded().catch(err => {
      console.error('[APP] Failed to seed demo users:', err);
    });
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

function AppInitializer({ children }: { children: React.ReactNode }) {
  const { isInitializing, isReady, error } = useAppInit();

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Initializing app...</Text>
      </View>
    );
  }

  // Show error if initialization failed (but still render app)
  if (error) {
    console.error('[APP] Initialization error (continuing anyway):', error);
  }

  // Only render children when ready
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <AppInitializer>
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
    </AppInitializer>
  );
}
