// Polyfills must come first
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';

// CRITICAL: Pre-emptive corruption check before ANY storage reads
if (Platform.OS !== 'web') {
  (async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      
      // Nuclear option: if we get any storage-related error in the next 100ms,
      // we'll clear everything
      const originalError = console.error;
      let detectedStorageError = false;
      
      console.error = (...args: any[]) => {
        const errorStr = args.join(' ');
        if ((errorStr.includes('SyntaxError') || errorStr.includes("';' expected")) && !detectedStorageError) {
          detectedStorageError = true;
          console.log('[PRE-INIT] 🚨 Detected storage corruption, clearing ALL storage immediately...');
          AsyncStorage.clear()
            .then(() => console.log('[PRE-INIT] ✅ Emergency clear successful'))
            .catch((err: any) => console.error('[PRE-INIT] ❌ Emergency clear failed:', err));
        }
        originalError(...args);
      };
      
      // Restore after 2 seconds
      setTimeout(() => {
        console.error = originalError;
      }, 2000);
    } catch (e) {
      // Silently ignore - this is best-effort
    }
  })();
}

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
import React from "react";

LogBox.ignoreLogs([
  'Deep imports from the \'react-native\' package are deprecated',
  'Failed to get NitroModules',
  'NitroModules',
  'react-native-mmkv',
]);

SplashScreen.preventAutoHideAsync();



function RootLayoutNav() {
  const { session, isLoading } = useAuth();
  const { prefs, isLoading: onboardingLoading } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  const navigationRef = useRef<{ lastRoute: string | null }>({ lastRoute: null });
  const [isHydrated, setIsHydrated] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
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
  const [showError, setShowError] = useState(false);
  const [emergencyClearTriggered, setEmergencyClearTriggered] = useState(false);
  
  // Global error handler for uncaught errors during initialization
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      // Log the error normally
      originalError(...args);
      
      // Check if it's a syntax error related to JSON parsing
      const errorStr = args.join(' ');
      if ((errorStr.includes('SyntaxError') || errorStr.includes("';' expected")) && !emergencyClearTriggered) {
        console.warn('[APP] 🚨 Detected SyntaxError during initialization - triggering nuclear clear');
        setEmergencyClearTriggered(true);
        
        // Nuclear option: clear all storage immediately
        (async () => {
          try {
            const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
            await AsyncStorage.clear();
            console.log('[APP] ✅ Nuclear storage clear successful - please reload the app');
          } catch (clearError) {
            console.error('[APP] ❌ Nuclear clear failed:', clearError);
          }
        })();
      }
    };
    
    return () => {
      console.error = originalError;
    };
  }, [emergencyClearTriggered]);

  // Show loading screen during initialization
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text style={{ fontSize: 16, color: '#666' }}>Initializing app...</Text>
      </View>
    );
  }

  // Show error if initialization failed
  if (error && showError) {
    console.error('[APP] Initialization error:', error);
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#000' }}>
          Initialization Error
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: '#666' }}>
          Unable to initialize the app. Please check your internet connection and try again.
        </Text>
        <Text style={{ fontSize: 12, color: '#999', marginBottom: 20, textAlign: 'center' }}>
          {error.message}
        </Text>
        <Pressable
          onPress={() => {
            setShowError(false);
            // Force a reload by resetting the app
            SplashScreen.hideAsync().catch(() => {});
          }}
          style={{
            backgroundColor: '#007AFF',
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  // Log errors but continue (set timeout to show error UI if app doesn't load)
  if (error) {
    console.error('[APP] Initialization error (continuing anyway):', error);
    setTimeout(() => setShowError(true), 5000); // Show error after 5s if app hasn't loaded
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
