import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback, useEffect } from 'react';
import { getBaseUrl, getDefaultBaseUrl, isStaleUrl, clearStaleUrlIfNeeded } from '@/lib/baseUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrpcClient } from '@/lib/trpc';

import { createTrpcClient } from '@/lib/trpc';

const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';

export default function ClearStorageScreen() {
  const insets = useSafeAreaInsets();
  const [currentBase, setCurrentBase] = useState(getBaseUrl());
  const [defaultBase] = useState(getDefaultBaseUrl());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [hasStaleUrl, setHasStaleUrl] = useState(false);
  const [staleUrlDetected, setStaleUrlDetected] = useState<string | null>(null);

  // Check for stale URL on mount
  useEffect(() => {
    const checkStaleUrl = async () => {
      try {
        const override = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
        if (override && isStaleUrl(override)) {
          setHasStaleUrl(true);
          setStaleUrlDetected(override);
          console.log('[Clear Storage] ⚠️ Stale URL detected:', override);
        }
      } catch (error) {
        console.error('[Clear Storage] Error checking stale URL:', error);
      }
    };
    checkStaleUrl();
  }, []);

  const handleViewStorage = useCallback(async () => {
    try {
      const override = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('[AsyncStorage] All keys:', allKeys);
      console.log('[AsyncStorage] Override value:', override);
      setTestResult(`📦 AsyncStorage Contents:\n\nOverride: ${override || 'none'}\n\nAll keys: ${allKeys.join(', ')}`);
    } catch (error) {
      console.error('[AsyncStorage] View failed:', error);
      setTestResult(`❌ Failed to view: ${error}`);
    }
  }, []);

  const handleClearStaleUrl = useCallback(async () => {
    setIsClearing(true);
    setTestResult(null);
    try {
      console.log('[Clear Storage] Clearing stale URL...');
      const wasCleared = await clearStaleUrlIfNeeded();
      
      if (wasCleared) {
        setHasStaleUrl(false);
        setStaleUrlDetected(null);
        const newUrl = getDefaultBaseUrl();
        setCurrentBase(newUrl);
        setTestResult(`✅ Stale URL cleared successfully!\n\nNow using: ${newUrl}\n\nPlease restart the app.`);
        Alert.alert('Success', `Stale URL (${staleUrlDetected}) has been cleared!\n\nPlease close and restart the app.`, [{ text: 'OK' }]);
      } else {
        setTestResult(`ℹ️ No stale URL found to clear.`);
      }
    } catch (error) {
      console.error('[Clear Storage] Failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Failed: ${message}`);
    } finally {
      setIsClearing(false);
    }
  }, [staleUrlDetected]);

  const handleClearAndReset = useCallback(async () => {
    setIsClearing(true);
    setTestResult(null);
    try {
      console.log('[Clear Storage] Removing override key EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE ...');
      await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      if (typeof (globalThis as any).memoryOverride !== 'undefined') {
        (globalThis as any).memoryOverride = undefined;
      }
      const stored = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      console.log('[Clear Storage] Verify override now:', stored);
      const newUrl = getDefaultBaseUrl();
      setCurrentBase(newUrl);
      setHasStaleUrl(false);
      setStaleUrlDetected(null);
      setTestResult(`✅ Override removed. Using Base URL from .env: ${newUrl}`);
      Alert.alert('Success', 'Override removed. App will use the Render Base URL from .env. Please restart the app.', [{ text: 'OK' }]);
    } catch (error) {
      console.error('[Clear Storage] Failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Failed: ${message}`);
    } finally {
      setIsClearing(false);
    }
  }, []);

  const handleForceSetRenderUrl = useCallback(async () => {
    setIsClearing(true);
    setTestResult(null);
    try {
      console.log('[Clear Storage] Force setting Render URL...');
      await AsyncStorage.setItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE', RENDER_URL);
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = RENDER_URL;
      const stored = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      console.log('[Clear Storage] Verify override now:', stored);
      setCurrentBase(RENDER_URL);
      setTestResult(`✅ Render URL set: ${RENDER_URL}\n\nPlease restart the app for changes to take effect.`);
      Alert.alert('Success', `Render URL has been set to:\n\n${RENDER_URL}\n\nPlease close and restart the app.`, [{ text: 'OK' }]);
    } catch (error) {
      console.error('[Clear Storage] Failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Failed: ${message}`);
    } finally {
      setIsClearing(false);
    }
  }, []);

  async function handleTestConnection() {
    setIsTesting(true);
    setTestResult(null);
    try {
      console.log('[Clear Storage] Testing connection to:', getBaseUrl());
      const freshClient = createTrpcClient({ baseUrl: getBaseUrl() });
      const result = await freshClient.videosdk.checkConfig.query();
      console.log('[Clear Storage] Test result:', result);
      setTestResult(`✅ Success! Connected to ${getBaseUrl()}\n\nAPI is working correctly.`);
    } catch (error) {
      console.error('[Clear Storage] Test failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Failed: ${message}\n\nCurrent URL: ${getBaseUrl()}\n\nTry clearing storage below.`);
    } finally {
      setIsTesting(false);
    }
  }



  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 20 }}
    >
      <Text style={styles.title}>API Connection Debug</Text>
      
      {hasStaleUrl && staleUrlDetected && (
        <View style={[styles.section, styles.warningSection]}>
          <Text style={styles.warningTitle}>⚠️ Stale URL Detected!</Text>
          <Text style={styles.warningText}>
            Your app is using an old URL that may cause connection issues:
          </Text>
          <Text style={[styles.value, styles.staleUrlText]}>{staleUrlDetected}</Text>
          <Text style={styles.warningText}>
            This URL contains "rorkset.dev" which is no longer valid.
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>Current Base URL:</Text>
        <Text style={[styles.value, hasStaleUrl && styles.staleUrlValue]}>{currentBase}</Text>
        {hasStaleUrl && (
          <Text style={styles.staleIndicator}>⚠️ This is a stale URL</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Default (from .env):</Text>
        <Text style={styles.value}>{defaultBase}</Text>
      </View>

      {hasStaleUrl && (
        <TouchableOpacity 
          testID="clear-stale-url-button"
          style={[styles.button, styles.warningButton]} 
          onPress={handleClearStaleUrl}
          disabled={isClearing}
        >
          {isClearing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>🧹 Clear Stale rorkset.dev URL</Text>
          )}
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        testID="force-set-render-button"
        style={[styles.button, styles.setRenderButton]} 
        onPress={handleForceSetRenderUrl}
        disabled={isClearing}
      >
        {isClearing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🎯 Force Set Render URL</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        testID="clear-and-set-button"
        style={[styles.button, styles.primaryButton]} 
        onPress={handleClearAndReset}
        disabled={isClearing}
      >
        {isClearing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🧹 Remove Override Key</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        testID="test-connection-button"
        style={[styles.button, styles.testButton]} 
        onPress={handleTestConnection}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test Connection</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        testID="view-storage-button"
        style={[styles.button, styles.infoButton]} 
        onPress={handleViewStorage}
      >
        <Text style={styles.buttonText}>📦 View AsyncStorage</Text>
      </TouchableOpacity>

      {testResult && (
        <View testID="test-result" style={[styles.section, testResult.includes('✅') ? styles.success : styles.error]}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.infoTitle}>ℹ️ Quick Fix Instructions</Text>
      <Text style={styles.infoText}>
        {hasStaleUrl ? (
          <>
            ⚠️ Stale URL Detected!{"\n\n"}
            Your app is using an old rorkset.dev URL. To fix:{"\n\n"}
            1. Tap {`"`}Clear Stale rorkset.dev URL{`"`} above{"\n"}
            2. Wait for confirmation{"\n"}
            3. Close the app completely (swipe away from recent apps){"\n"}
            4. Restart the app{"\n"}
            5. Use {`"`}Test Connection{`"`} to verify{"\n\n"}
            This will remove the old URL and use the correct Render URL.
          </>
        ) : (
          <>
            If you're seeing tRPC 404 errors:{"\n\n"}
            1. Tap {`"`}Force Set Render URL{`"`} above{"\n"}
            2. Wait for confirmation{"\n"}
            3. Close the app completely (swipe away from recent apps){"\n"}
            4. Restart the app{"\n"}
            5. Use {`"`}Test Connection{`"`} to verify{"\n\n"}
            This will force the app to use the correct production URL.
          </>
        )}
      </Text>

      <View style={styles.divider} />

      <Text style={styles.debugTitle}>🔍 Debug Info</Text>
      <Text style={styles.debugText}>
        Target URL: {RENDER_URL}{"\n"}
        The app uses EXPO_PUBLIC_RORK_API_BASE_URL from .env. Override key is removed.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 30,
    color: '#000',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  value: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#000',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#28a745',
  },
  testButton: {
    backgroundColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  setRenderButton: {
    backgroundColor: '#28a745',
  },
  infoButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  success: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
  },
  error: {
    backgroundColor: '#f8d7da',
    borderColor: '#f5c6cb',
    borderWidth: 1,
  },
  resultText: {
    fontSize: 13,
    color: '#000',
    fontFamily: 'monospace',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 30,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#004085',
  },
  infoText: {
    fontSize: 14,
    color: '#004085',
    marginBottom: 10,
    lineHeight: 22,
    backgroundColor: '#cce5ff',
    padding: 15,
    borderRadius: 8,
    borderColor: '#b8daff',
    borderWidth: 1,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#383d41',
  },
  debugText: {
    fontSize: 13,
    color: '#383d41',
    fontFamily: 'monospace',
    backgroundColor: '#e2e3e5',
    padding: 15,
    borderRadius: 8,
    borderColor: '#d6d8db',
    borderWidth: 1,
  },
  warningSection: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFC107',
    borderWidth: 2,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 8,
  },
  warningButton: {
    backgroundColor: '#FFC107',
  },
  staleUrlText: {
    color: '#DC3545',
    fontWeight: '600',
    marginVertical: 8,
  },
  staleUrlValue: {
    color: '#DC3545',
  },
  staleIndicator: {
    fontSize: 12,
    color: '#DC3545',
    fontWeight: '600',
    marginTop: 4,
  },
});
