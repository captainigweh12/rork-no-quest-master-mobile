import { ExpoConfig } from '@expo/config';

export default (): ExpoConfig => {
  // OTA updates disabled by default for stability during development
  // Set OTA_ENABLED=true when ready for production OTA updates
  const OTA_ENABLED = process.env.OTA_ENABLED === 'true';

  return {
    name: 'No Quest Master Mobile',
    slug: 'no-quest-master-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'noquest',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'app.rork.noquestmastermobile',
      infoPlist: {
        NSLocationAlwaysAndWhenInUseUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
        NSLocationAlwaysUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
        NSLocationWhenInUseUsageDescription: 'Allow $(PRODUCT_NAME) to use your location.',
        UIBackgroundModes: ['location', 'remote-notification'],
        NSPhotoLibraryUsageDescription: 'Allow $(PRODUCT_NAME) to access your photos.',
        NSCameraUsageDescription: 'Allow $(PRODUCT_NAME) to access your camera.',
        NSMicrophoneUsageDescription: 'Allow $(PRODUCT_NAME) to access your microphone.',
      },
    },
    android: {
      package: 'app.rork.noquestmastermobile',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      permissions: [
        'VIBRATE',
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'FOREGROUND_SERVICE',
        'FOREGROUND_SERVICE_LOCATION',
        'ACCESS_BACKGROUND_LOCATION',
        'RECEIVE_BOOT_COMPLETED',
        'SCHEDULE_EXACT_ALARM',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'android.permission.VIBRATE',
        'android.permission.RECEIVE_BOOT_COMPLETED',
        'android.permission.SCHEDULE_EXACT_ALARM',
        'INTERNET',
        'RECORD_AUDIO',
      ],
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          category: ['BROWSABLE', 'DEFAULT'],
          data: [
            {
              scheme: 'noquest',
              host: 'auth',
              pathPrefix: '/callback',
            },
          ],
        },
      ],
    },
    web: {
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      ['expo-router'],
      [
        'expo-location',
        {
          isAndroidForegroundServiceEnabled: true,
          isAndroidBackgroundLocationEnabled: true,
          isIosBackgroundLocationEnabled: true,
          locationAlwaysAndWhenInUsePermission: 'Allow $(PRODUCT_NAME) to use your location.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#ffffff',
          defaultChannel: 'default',
          enableBackgroundRemoteNotifications: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission: 'The app accesses your photos to let you share them with your friends.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Allow $(PRODUCT_NAME) to access your camera',
          microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone',
          recordAudioAndroid: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      SUPABASE_URL: 'https://hotbmbscjxgayivmyenb.supabase.co',
      SUPABASE_ANON_KEY:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdGJtYnNjanhnYXlpdm15ZW5iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0MjgyMDgsImV4cCI6MjA3NzAwNDIwOH0.8pU3MXu8ylwSORBzXMQqbQ6ZBKXh9tXWALiJo1A8E8M',
      APP_BASE_URL: 'https://rork-no-quest-master-mobile.onrender.com',
      EMAIL_REDIRECT: 'noquest://verify-email',
      eas: {
        projectId: 'c23bcbuqrsjmkdoaxiu6y',
      },
      // Pass OTA status to runtime for guarded checks
      otaEnabled: OTA_ENABLED,
    },
    // Dynamic OTA configuration based on environment
    // Runtime uses checkOnLaunch/ERROR_RECOVERY (casting to bypass outdated TypeScript types)
    updates: (OTA_ENABLED
      ? {
          enabled: true,
          url: 'https://u.expo.dev/c23bcbuqrsjmkdoaxiu6y',
          checkOnLaunch: 'ERROR_RECOVERY', // Only check after crashes
          fallbackToCacheTimeout: 0,
        }
      : {
          enabled: false,
          checkOnLaunch: 'NEVER',
          fallbackToCacheTimeout: 0,
        }) as any,
    runtimeVersion: {
      policy: 'appVersion', // Stable runtime versioning
    },
  };
};
