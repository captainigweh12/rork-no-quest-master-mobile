import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { loadBaseUrlOverride, setBaseUrlOverride } from '@/lib/baseUrl';

export default function EmergencyClearScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    console.log('[Emergency Clear] Screen loaded');
    (async () => {
      try {
        const override = await loadBaseUrlOverride();
        if (override) {
          setCleared(false);
          setCurrentOverride(override);
        } else {
          const g = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
          setCurrentOverride(g);
        }
      } catch (e) {
        console.warn('[Emergency Clear] Could not read override:', e);
      }
    })();
  }, []);

  const [currentOverride, setCurrentOverride] = useState<string | undefined>(undefined);

  async function handleEmergencyClear() {
    try {
      console.log('[Emergency Clear] Starting emergency clear...');
      
      const allKeys = (AsyncStorage && typeof (AsyncStorage as any).getAllKeys === 'function')
        ? await (AsyncStorage as any).getAllKeys()
        : [];
      console.log('[Emergency Clear] All keys before clear:', allKeys);

      if (AsyncStorage && typeof (AsyncStorage as any).clear === 'function') {
        await (AsyncStorage as any).clear();
        console.log('[Emergency Clear] AsyncStorage cleared');
      }

      // Clear in-memory override and persisted override via helper
      await setBaseUrlOverride(undefined);
      console.log('[Emergency Clear] Override cleared');

      const renderUrl = 'https://rork-no-quest-master-mobile.onrender.com';
      await setBaseUrlOverride(renderUrl);
      console.log('[Emergency Clear] New URL set via helper:', renderUrl);

      const verifyKeys = (AsyncStorage && typeof (AsyncStorage as any).getAllKeys === 'function')
        ? await (AsyncStorage as any).getAllKeys()
        : [];
      console.log('[Emergency Clear] Keys after clear:', verifyKeys);

      const verifyUrl = (globalThis as any).__RORK_BASE_URL_OVERRIDE as string | undefined;
      console.log('[Emergency Clear] Verified URL:', verifyUrl);
      setCurrentOverride(verifyUrl);
      
      setCleared(true);
      
      Alert.alert(
        '✅ Emergency Clear Complete',
        `All caches cleared!\n\nNew URL: ${renderUrl}\n\n⚠️ CRITICAL: You MUST now:\n1. Close this app completely\n2. Swipe it away from recent apps\n3. Restart the app\n\nThe changes will NOT work until you restart!`,
        [
          {
            text: 'I Understand - Close App',
            onPress: () => {
              console.log('[Emergency Clear] User acknowledged, returning to auth');
              router.replace('/auth');
            }
          }
        ]
      );
    } catch (error) {
      console.error('[Emergency Clear] Failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      Alert.alert('Emergency Clear Failed', errorMsg);
    }
  }

  async function handleClearOverride() {
    try {
      await setBaseUrlOverride(undefined);
      setCurrentOverride(undefined);
      Alert.alert('Override cleared', 'Base URL override removed. Restart the app.');
    } catch (e) {
      Alert.alert('Failed to clear override', String(e));
    }
  }

  async function handleSetRenderUrl() {
    try {
      const renderUrl = 'https://rork-no-quest-master-mobile.onrender.com';
      await setBaseUrlOverride(renderUrl);
      setCurrentOverride(renderUrl);
      Alert.alert('Override set', `Set base URL to ${renderUrl}. Restart the app.`);
    } catch (e) {
      Alert.alert('Failed to set override', String(e));
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🚨</Text>
        <Text style={styles.title}>Emergency Clear</Text>
        <Text style={styles.description}>
          This will force-clear ALL AsyncStorage data and reset the API URL to the Render deployment.
        </Text>
        <Text style={styles.warning}>
          ⚠️ Use this ONLY if:
        </Text>
        <Text style={styles.warningItem}>• The app won&apos;t load</Text>
        <Text style={styles.warningItem}>• You see &quot;rorktest.dev&quot; errors</Text>
        <Text style={styles.warningItem}>• Regular clear storage didn&apos;t work</Text>

        {cleared && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Cleared Successfully!</Text>
            <Text style={styles.successSubtext}>Close and restart the app now.</Text>
          </View>
        )}

        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>Current override:</Text>
          <Text style={{ fontSize: 14, color: '#111', fontWeight: '700', textAlign: 'center' }}>{currentOverride ?? 'none'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.secondaryButton, { marginTop: 16 }]} 
          onPress={handleClearOverride}
        >
          <Text style={styles.secondaryButtonText}>Clear Override</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { marginTop: 8 }]} 
          onPress={handleSetRenderUrl}
        >
          <Text style={styles.secondaryButtonText}>Set Render URL Override</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, cleared && styles.buttonDisabled]} 
          onPress={handleEmergencyClear}
          disabled={cleared}
        >
          <Text style={styles.buttonText}>
            {cleared ? 'Cleared - Restart App' : 'EMERGENCY CLEAR NOW'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  warning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 12,
    textAlign: 'center',
  },
  warningItem: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 6,
    textAlign: 'center',
  },
  successBox: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 2,
    borderRadius: 12,
    padding: 20,
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  successText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#155724',
  },
  button: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 32,
    minWidth: 250,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
