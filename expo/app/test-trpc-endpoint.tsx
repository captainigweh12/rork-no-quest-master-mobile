import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { getBaseUrl } from '@/lib/baseUrl';

export default function TestTRPCEndpoint() {
  const insets = useSafeAreaInsets();
  const [testResult, setTestResult] = useState<string>('');
  const [isTesting, setIsTesting] = useState(false);

  async function testHealthEndpoint() {
    setIsTesting(true);
    setTestResult('');
    try {
      const baseUrl = getBaseUrl();
      console.log('[Test] Base URL:', baseUrl);
      
      const healthUrl = `${baseUrl}/api/health`;
      console.log('[Test] Testing health endpoint:', healthUrl);
      
      const response = await fetch(healthUrl);
      const data = await response.json();
      
      console.log('[Test] Health response:', data);
      setTestResult(`✅ Health Check Success!\n\nStatus: ${response.status}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('[Test] Health check failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ Health check failed:\n${message}`);
    } finally {
      setIsTesting(false);
    }
  }

  async function testVideoSDKConfig() {
    setIsTesting(true);
    setTestResult('');
    try {
      const baseUrl = getBaseUrl();
      console.log('[Test] Base URL:', baseUrl);
      
      const configUrl = `${baseUrl}/api/trpc/videosdk.checkConfig`;
      console.log('[Test] Testing VideoSDK config:', configUrl);
      
      const response = await fetch(configUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const text = await response.text();
      console.log('[Test] Raw response:', text);
      
      if (!response.ok) {
        setTestResult(`❌ Request failed!\n\nStatus: ${response.status}\n\nResponse: ${text}`);
        return;
      }
      
      const data = JSON.parse(text);
      console.log('[Test] Config response:', data);
      setTestResult(`✅ VideoSDK Config Success!\n\nStatus: ${response.status}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('[Test] VideoSDK config failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ VideoSDK config failed:\n${message}`);
    } finally {
      setIsTesting(false);
    }
  }

  async function testVideoSDKToken() {
    setIsTesting(true);
    setTestResult('');
    try {
      const baseUrl = getBaseUrl();
      console.log('[Test] Base URL:', baseUrl);
      
      const tokenUrl = `${baseUrl}/api/trpc/videosdk.getToken`;
      console.log('[Test] Testing VideoSDK token:', tokenUrl);
      
      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const text = await response.text();
      console.log('[Test] Raw response:', text);
      
      if (!response.ok) {
        setTestResult(`❌ Request failed!\n\nStatus: ${response.status}\n\nResponse: ${text}`);
        return;
      }
      
      const data = JSON.parse(text);
      console.log('[Test] Token response:', data);
      setTestResult(`✅ VideoSDK Token Success!\n\nStatus: ${response.status}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('[Test] VideoSDK token failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ VideoSDK token failed:\n${message}`);
    } finally {
      setIsTesting(false);
    }
  }

  async function testTRPCBatch() {
    setIsTesting(true);
    setTestResult('');
    try {
      const baseUrl = getBaseUrl();
      console.log('[Test] Base URL:', baseUrl);
      
      const batchUrl = `${baseUrl}/api/trpc/videosdk.checkConfig,videosdk.getToken`;
      console.log('[Test] Testing tRPC batch:', batchUrl);
      
      const response = await fetch(batchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const text = await response.text();
      console.log('[Test] Raw response:', text);
      
      if (!response.ok) {
        setTestResult(`❌ Request failed!\n\nStatus: ${response.status}\n\nResponse: ${text}`);
        return;
      }
      
      const data = JSON.parse(text);
      console.log('[Test] Batch response:', data);
      setTestResult(`✅ tRPC Batch Success!\n\nStatus: ${response.status}\n\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('[Test] tRPC batch failed:', error);
      const message = error instanceof Error ? error.message : String(error);
      setTestResult(`❌ tRPC batch failed:\n${message}`);
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }}
    >
      <Text style={styles.title}>tRPC Endpoint Tests</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Current Base URL:</Text>
        <Text style={styles.value}>{getBaseUrl()}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={testHealthEndpoint}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test /api/health</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={testVideoSDKConfig}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test VideoSDK Config (GET)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.primaryButton]} 
        onPress={testVideoSDKToken}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test VideoSDK Token (POST)</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.testButton]} 
        onPress={testTRPCBatch}
        disabled={isTesting}
      >
        {isTesting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test tRPC Batch</Text>
        )}
      </TouchableOpacity>

      {testResult && (
        <View style={[styles.section, testResult.includes('✅') ? styles.success : styles.error]}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <Text style={styles.infoTitle}>ℹ️ What to test:</Text>
      <Text style={styles.infoText}>
        1. Health endpoint should return 200 OK{"\n"}
        2. VideoSDK Config should work with GET{"\n"}
        3. VideoSDK Token should work with POST{"\n"}
        4. Batch request tests the tRPC batch functionality
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
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  testButton: {
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
});
