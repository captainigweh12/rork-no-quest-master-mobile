import '@/lib/polyfills/reactUse';
import React, { useEffect, useMemo } from 'react';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TrpcProvider from '@/providers/TrpcProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { GameProvider } from '@/contexts/GameContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { LocalizationProvider } from '@/contexts/LocalizationContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { YouTubeProvider } from '@/contexts/YouTubeContext';
import { StreamProvider } from '@/contexts/StreamContext';
import { VideoSDKContextProvider } from '@/contexts/VideoSDKContext';
// DailyProvider is platform-specific: native uses full implementation, web uses stub.
import { DailyProvider } from '@/contexts/DailyContext';

function OptionalRorkDev({ children }: { children: React.ReactNode }) {
  const Wrapper = useMemo(() => {
    try {
      const mod = require('@rork-ai/toolkit-dev-sdk');
      return mod.RorkDevWrapper ?? ((p: any) => p.children);
    } catch {
      return (p: any) => p.children;
    }
  }, []);
  return <Wrapper>{children}</Wrapper>;
}

export default function RootLayout() {
  useEffect(() => {
    LogBox.ignoreLogs([
      'Require cycle:',
      'AsyncStorage has been extracted',
      'Non-serializable values were found',
    ]);
  }, []);

  return (
    <OptionalRorkDev>
      <SafeAreaProvider>
        <TrpcProvider>
          <LocalizationProvider>
            <ThemeProvider>
              <AuthProvider>
                <GameProvider>
                  <CategoriesProvider>
                    <NotificationsProvider>
                      <SubscriptionProvider>
                        <OnboardingProvider>
                          <YouTubeProvider>
                            <StreamProvider>
                              <VideoSDKContextProvider>
                                <DailyProvider>
                                  <Stack
                                    screenOptions={{
                                      headerShown: false,
                                      animation: 'fade',
                                    }}
                                  >
                                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                                    <Stack.Screen name="auth" options={{ headerShown: false }} />
                                    <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                                    <Stack.Screen name="account" options={{ title: 'Account' }} />
                                    <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                                    <Stack.Screen name="profile" options={{ title: 'Profile' }} />
                                    <Stack.Screen name="create-quest" options={{ presentation: 'modal', title: 'Create Quest' }} />
                                    <Stack.Screen name="stream" options={{ presentation: 'modal', title: 'Start Stream' }} />
                                    <Stack.Screen name="invite/[code]" options={{ title: 'Accept Invite' }} />
                                  </Stack>
                                </DailyProvider>
                              </VideoSDKContextProvider>
                            </StreamProvider>
                          </YouTubeProvider>
                        </OnboardingProvider>
                      </SubscriptionProvider>
                    </NotificationsProvider>
                  </CategoriesProvider>
                </GameProvider>
              </AuthProvider>
            </ThemeProvider>
          </LocalizationProvider>
        </TrpcProvider>
      </SafeAreaProvider>
    </OptionalRorkDev>
  );
}
