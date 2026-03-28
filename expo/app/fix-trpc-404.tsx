import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { 
  getBaseUrl, 
  clearBaseUrlOverride, 
  loadBaseUrlOverride,
  getDefaultBaseUrl,
  clearStaleUrlIfNeeded 
} from '@/lib/baseUrl';
import { router } from 'expo-router';

export default function FixTrpc404Screen() {
  const [currentUrl, setCurrentUrl] = useState<string>('Loading...');
  const [overrideUrl, setOverrideUrl] = useState<string | undefined>(undefined);
  const [defaultUrl, setDefaultUrl] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUrlInfo();
  }, []);

  const loadUrlInfo = async () => {
    const current = getBaseUrl();
    const override = await loadBaseUrlOverride();
    const def = getDefaultBaseUrl();
    
    setCurrentUrl(current);
    setOverrideUrl(override);
    setDefaultUrl(def);
  };

  const handleClearCache = async () => {
    try {
      setIsLoading(true);
      console.log('🧹 Clearing AsyncStorage URL override...');
      
      // Clear the base URL override
      await clearBaseUrlOverride();
      
      // Check and clear any stale URLs
      const wasStale = await clearStaleUrlIfNeeded();
      
      // Reload URL info
      await loadUrlInfo();
      
      Alert.alert(
        'Success',
        wasStale 
          ? 'Cleared stale URL from cache. App will use default URL now.'
          : 'Cache cleared. App will use default URL now.',
        [{ text: 'OK' }]
      );
      
      setTestResult('✅ Cache cleared successfully');
    } catch (error) {
      console.error('Error clearing cache:', error);
      Alert.alert('Error', 'Failed to clear cache: ' + (error instanceof Error ? error.message : String(error)));
      setTestResult('❌ Error clearing cache');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsLoading(true);
      setTestResult('🔄 Testing connection...');
      
      const url = getBaseUrl();
      console.log('🧪 Testing connection to:', url);
      
      // Test 1: Health check
      const healthUrl = `${url}/api/health`;
      console.log('Testing health endpoint:', healthUrl);
      
      const healthResponse = await fetch(healthUrl);
      const healthData = await healthResponse.json();
      
      console.log('Health check result:', healthData);
      
      if (!healthResponse.ok) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
      // Test 2: tRPC endpoint
      const trpcUrl = `${url}/api/trpc/videosdk.getToken`;
      console.log('Testing tRPC endpoint:', trpcUrl);
      
      const trpcResponse = await fetch(trpcUrl);
      const trpcData = await trpcResponse.json();
      
      console.log('tRPC test result:', trpcData);
      
      if (!trpcResponse.ok) {
        throw new Error(`tRPC test failed: ${trpcResponse.status}`);
      }
      
      setTestResult(`✅ Connection successful!\n\nHealth: ${healthData.status}\ntRPC: Working`);
      
      Alert.alert(
        'Connection Test Passed',
        'Both health check and tRPC endpoint are working correctly!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Connection test failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Connection test failed:\n${errorMsg}`);
      
      Alert.alert(
        'Connection Test Failed',
        errorMsg,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    Alert.alert(
      'Restart Required',
      'To apply changes, you need to restart the app. Close and reopen the app now.',
      [
        { text: 'Later', style: 'cancel' },
        { 
          text: 'Go Back', 
          onPress: () => router.back()
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Fix tRPC 404 Errors</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.label}>Current Base URL:</Text>
            <Text style={styles.value}>{currentUrl}</Text>
          </View>
          
          <View style={styles.infoBox}>
            <Text style={styles.label}>Default URL (.env):</Text>
            <Text style={styles.value}>{defaultUrl}</Text>
          </View>
          
          {overrideUrl && (
            <View style={[styles.infoBox, styles.warningBox]}>
              <Text style={styles.label}>⚠️ AsyncStorage Override:</Text>
              <Text style={styles.value}>{overrideUrl}</Text>
              <Text style={styles.warning}>
                This cached URL is overriding the default URL from .env
              </Text>
            </View>
          )}
        </View>

        {testResult ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultText}>{testResult}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleTestConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '⏳ Testing...' : '🧪 Test Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.warningButton]}
            onPress={handleClearCache}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? '⏳ Clearing...' : '🧹 Clear Cached URL'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleRestart}
          >
            <Text style={styles.buttonText}>
              🔄 Restart App
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.backButton]}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>
              ← Go Back
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>
            1. First, tap "Test Connection" to check if the backend is accessible{'\n'}
            2. If the test fails, tap "Clear Cached URL" to remove any stale URLs{'\n'}
            3. After clearing cache, tap "Restart App" and close/reopen the app{'\n'}
            4. The app should now use the correct URL from .env{'\n\n'}
            
            Expected URL: https://rork-no-quest-master-mobile.onrender.com{'\n\n'}
            
            If issues persist, check your internet connection and verify the backend is deployed on Render.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  warningBox: {
    backgroundColor: '#2a1a00',
    borderColor: '#ff9500',
    borderWidth: 1,
  },
  label: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 5,
  },
  value: {
    fontSize: 12,
    color: '#aaa',
    fontFamily: 'monospace',
  },
  warning: {
    fontSize: 12,
    color: '#ff9500',
    marginTop: 5,
    fontStyle: 'italic',
  },
  resultBox: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  resultText: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  warningButton: {
    backgroundColor: '#ff9500',
  },
  secondaryButton: {
    backgroundColor: '#5856D6',
  },
  backButton: {
    backgroundColor: '#333',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 20,
  },
});
