import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { setBaseUrlOverride, getBaseUrl, getDefaultBaseUrl } from '@/lib/baseUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTrpcClient } from '@/lib/trpc';

export default function ClearStorageScreen() {
  const insets = useSafeAreaInsets();
  const [currentBase, setCurrentBase] = useState(getBaseUrl());
  const [defaultBase] = useState(getDefaultBaseUrl());
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

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

  async function handleClearOverride() {
    try {
      console.log('[Clear Storage] Clearing all storage and override...');
      
      await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      
      await AsyncStorage.clear();
      
      await setBaseUrlOverride(undefined);
      
      (globalThis as any).__RORK_BASE_URL_OVERRIDE = undefined;
      
      const allKeys = await AsyncStorage.getAllKeys();
      console.log('[Clear Storage] Remaining keys after clear:', allKeys);
      
      const newUrl = getBaseUrl();
      setCurrentBase(newUrl);
      setTestResult(null);
      console.log('[Clear Storage] Cleared! New base URL:', newUrl);
      
      Alert.alert(
        'Success', 
        `Cleared all storage!\n\nOld URL removed\nNew URL: ${newUrl}\n\n✅ Please fully CLOSE and RESTART the app now!`,
        [
          { text: 'OK' }
        ]
      );
    } catch (error) {
      console.error('[Clear Storage] Clear failed:', error);
      Alert.alert('Error', String(error));
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

      {testResult && (
        <View testID="test-result" style={[styles.section, testResult.includes('✅') ? styles.success : styles.error]}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.warningTitle}>⚠️ Clear Storage</Text>
      <Text style={styles.warningText}>
        This will remove ALL cached data including any old API URLs. Only use this if you&apos;re experiencing connection issues.
      </Text>

      <TouchableOpacity testID="clear-storage-button" style={[styles.button, styles.dangerButton]} onPress={handleClearOverride}>
        <Text style={styles.buttonText}>Clear All Storage & Override</Text>
      </TouchableOpacity>

      <TouchableOpacity
        testID="set-render-override-button"
        style={[styles.button, styles.setRenderButton]}
        onPress={async () => {
          try {
            const url = 'https://rork-no-quest-master-mobile.onrender.com';
            console.log('[Clear Storage] Setting Render URL override:', url);
            await setBaseUrlOverride(url);
            (globalThis as any).__RORK_BASE_URL_OVERRIDE = url;
            const newUrl = getBaseUrl();
            setCurrentBase(newUrl);
            console.log('[Clear Storage] Override set! Current URL:', newUrl);
            Alert.alert('Override Set', `Base URL set to:\n${url}\n\nPlease restart the app completely.`);
          } catch (e) {
            console.error('[Clear Storage] Set override failed:', e);
            Alert.alert('Error', String(e));
          }
        }}
      >
        <Text style={styles.buttonText}>Use Render URL (Override)</Text>
      </TouchableOpacity>
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
  testButton: {
    backgroundColor: '#007AFF',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  setRenderButton: {
    backgroundColor: '#28a745',
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
  warningTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
    color: '#856404',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 10,
    lineHeight: 20,
  },
});
