import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useCallback } from 'react';
import { setBaseUrlOverride, getBaseUrl, getDefaultBaseUrl } from '@/lib/baseUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTrpcClient } from '@/lib/trpc';

const RENDER_URL = 'https://rork-no-quest-master-mobile.onrender.com';

export default function ClearStorageScreen() {
  const insets = useSafeAreaInsets();
  const [currentBase, setCurrentBase] = useState(getBaseUrl());
  const [defaultBase] = useState(getDefaultBaseUrl());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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

  const handleClearAndReset = useCallback(async () => {
    setIsClearing(true);
    setTestResult(null);
    
    try {
      console.log('[Clear Storage] Step 1: Clearing all AsyncStorage...');
      await AsyncStorage.clear();
      
      console.log('[Clear Storage] Step 2: Removing all global overrides...');
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      if (typeof (globalThis as any).memoryOverride !== 'undefined') {
        (globalThis as any).memoryOverride = undefined;
      }
      
      console.log('[Clear Storage] Step 3: Setting new Render URL:', RENDER_URL);
      await setBaseUrlOverride(RENDER_URL);
      
      console.log('[Clear Storage] Step 4: Forcing memory sync...');
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = RENDER_URL;
      
      console.log('[Clear Storage] Step 5: Verifying...');
      const stored = await AsyncStorage.getItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      console.log('[Clear Storage] Stored in AsyncStorage:', stored);
      
      const newUrl = getBaseUrl();
      console.log('[Clear Storage] getBaseUrl() returns:', newUrl);
      setCurrentBase(newUrl);
      
      setTestResult(`✅ Storage cleared!\n\nNew URL: ${RENDER_URL}\n\nPlease close and restart the app completely for changes to take full effect.`);
      
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
      const freshClient = createTrpcClient();
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
      
      <View style={styles.section}>
        <Text style={styles.label}>Current Base URL:</Text>
        <Text style={styles.value}>{currentBase}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Default (from .env):</Text>
        <Text style={styles.value}>{defaultBase}</Text>
      </View>

      <TouchableOpacity 
        testID="clear-and-set-button"
        style={[styles.button, styles.primaryButton]} 
        onPress={handleClearAndReset}
        disabled={isClearing}
      >
        {isClearing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>🧹 Clear Cache & Set Render URL</Text>
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

      <Text style={styles.infoTitle}>ℹ️ Instructions</Text>
      <Text style={styles.infoText}>
        1. Tap {`"`}Clear Cache & Set Render URL{`"`} above{"\n"}
        2. Wait for confirmation{"\n"}
        3. Close the app completely (swipe away from recent apps){"\n"}
        4. Restart the app{"\n"}
        5. Use {`"`}Test Connection{`"`} to verify
      </Text>

      <View style={styles.divider} />

      <Text style={styles.debugTitle}>🔍 Debug Info</Text>
      <Text style={styles.debugText}>
        Target URL: {RENDER_URL}{"\n"}
        The app should connect to this Render backend after clearing.
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
});
