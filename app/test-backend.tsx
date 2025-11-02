import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

function DevTestBackendScreen() {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };

  const clearLogs = () => setLogs([]);

  const testHealthEndpoint = async () => {
    addLog('🏥 Testing /api/health endpoint...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      addLog(`Base URL: ${baseUrl}`);
      
      const url = `${baseUrl}/api/health`;
      addLog(`Fetching: ${url}`);
      
      const response = await fetch(url);
      addLog(`Status: ${response.status} ${response.statusText}`);
      
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type: ${contentType}`);
      
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        addLog(`✅ Success: ${JSON.stringify(data, null, 2)}`);
      } else {
        const text = await response.text();
        addLog(`❌ Got HTML/Text instead of JSON: ${text.substring(0, 200)}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
      addLog(`Error details: ${JSON.stringify(error, null, 2)}`);
    }
  };

  const testRootEndpoint = async () => {
    addLog('🌐 Testing root / endpoint...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const url = `${baseUrl}/`;
      addLog(`Fetching: ${url}`);
      
      const response = await fetch(url);
      addLog(`Status: ${response.status}`);
      
      const data = await response.json();
      addLog(`✅ Success: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testTRPCEndpoint = async () => {
    addLog('🔵 Testing /api/trpc endpoint...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const url = `${baseUrl}/api/trpc/auth.sendVerificationEmail`;
      addLog(`Fetching: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          fullName: 'Test User',
          verificationCode: '123456',
        }),
      });
      
      addLog(`Status: ${response.status}`);
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type: ${contentType}`);
      
      const text = await response.text();
      addLog(`Response (first 500 chars): ${text.substring(0, 500)}`);
      
      if (contentType?.includes('application/json')) {
        try {
          const data = JSON.parse(text);
          addLog(`✅ JSON parsed: ${JSON.stringify(data, null, 2)}`);
        } catch {
          addLog(`❌ Failed to parse as JSON`);
        }
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testDNS = async () => {
    addLog('🌍 Testing DNS resolution...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      addLog(`Base URL: ${baseUrl}`);
      
      const hostname = baseUrl?.replace('https://', '').replace('http://', '');
      addLog(`Hostname: ${hostname}`);
      
      addLog('Attempting connection...');
      const response = await fetch(baseUrl + '/');
      addLog(`✅ DNS resolved! Status: ${response.status}`);
    } catch (error: any) {
      addLog(`❌ DNS Error: ${error.message}`);
    }
  };

  const testAgoraEnv = async () => {
    addLog('🎥 Testing Agora env endpoint...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const url = `${baseUrl}/api/trpc/agora.env`;
      addLog(`Fetching: ${url}`);
      
      const response = await fetch(url);
      addLog(`Status: ${response.status}`);
      
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type: ${contentType}`);
      
      const text = await response.text();
      addLog(`Response (first 500 chars): ${text.substring(0, 500)}`);
      
      if (contentType?.includes('application/json')) {
        try {
          const data = JSON.parse(text);
          addLog(`✅ JSON parsed: ${JSON.stringify(data, null, 2)}`);
        } catch {
          addLog(`❌ Failed to parse as JSON`);
        }
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const testAgoraRtcMint = async () => {
    addLog('🎫 Testing Agora RTC token mint...');
    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
      const url = `${baseUrl}/api/trpc/agora.rtcMint`;
      addLog(`Fetching: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AGORA-MINT-KEY': '071808291210',
        },
        body: JSON.stringify({
          channelName: 'test-channel',
          uid: 'test-user-123',
          role: 'publisher',
          expireSeconds: 3600,
        }),
      });
      
      addLog(`Status: ${response.status}`);
      const contentType = response.headers.get('content-type');
      addLog(`Content-Type: ${contentType}`);
      
      const text = await response.text();
      addLog(`Response (first 500 chars): ${text.substring(0, 500)}`);
      
      if (contentType?.includes('application/json')) {
        try {
          const data = JSON.parse(text);
          addLog(`✅ JSON parsed: ${JSON.stringify(data, null, 2)}`);
        } catch {
          addLog(`❌ Failed to parse as JSON`);
        }
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Backend Connection Test' }} />
      
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Backend Connection Tests</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Environment</Text>
          <Text style={styles.info}>Platform: {Platform.OS}</Text>
          <Text style={styles.info}>Base URL: {process.env.EXPO_PUBLIC_RORK_API_BASE_URL}</Text>
        </View>

        <View style={styles.buttonGrid}>
          <TouchableOpacity style={styles.button} onPress={testHealthEndpoint}>
            <Text style={styles.buttonText}>Test /api/health</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testRootEndpoint}>
            <Text style={styles.buttonText}>Test / (root)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testTRPCEndpoint}>
            <Text style={styles.buttonText}>Test tRPC</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testDNS}>
            <Text style={styles.buttonText}>Test DNS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testAgoraEnv}>
            <Text style={styles.buttonText}>Test Agora Env</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testAgoraRtcMint}>
            <Text style={styles.buttonText}>Test Agora RTC Mint</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearLogs}>
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.logsSection}>
          <Text style={styles.logsTitle}>Logs ({logs.length})</Text>
          <View style={styles.logsContainer}>
            {logs.length === 0 ? (
              <Text style={styles.noLogs}>No logs yet. Run a test above.</Text>
            ) : (
              logs.map((log, index) => (
                <Text key={index} style={styles.logItem}>
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProdBlocked() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ title: 'Backend Connection Test' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <Text>Not available in production</Text>
      </View>
    </SafeAreaView>
  );
}

export default function TestBackendScreen() {
  return (typeof __DEV__ !== 'undefined' && __DEV__ === true) ? <DevTestBackendScreen /> : <ProdBlocked />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  info: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  buttonGrid: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  logsSection: {
    marginBottom: 20,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  logsContainer: {
    backgroundColor: '#1e1e1e',
    padding: 16,
    borderRadius: 12,
    minHeight: 200,
  },
  noLogs: {
    color: '#888',
    fontStyle: 'italic',
  },
  logItem: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 8,
  },
});
