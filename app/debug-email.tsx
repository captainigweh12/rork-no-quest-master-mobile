import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';

export default function DebugEmailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('test@example.com');
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };

  const sendVerificationEmailMutation = trpc.auth.sendVerificationEmail.useMutation();

  const testEmail = async () => {
    setIsLoading(true);
    addLog('🔄 Starting tRPC email test...');
    addLog('');

    try {
      addLog(`📧 Calling mutation with:`);
      addLog(`   Email: ${email}`);
      addLog(`   Full Name: Test User`);
      addLog(`   Code: TEST01`);
      addLog('');
      
      const result = await sendVerificationEmailMutation.mutateAsync({
        email,
        fullName: 'Test User',
        verificationCode: 'TEST01',
      });

      addLog('✅ Mutation completed successfully');
      addLog('');
      addLog('📋 Result:');
      addLog(JSON.stringify(result, null, 2));
      addLog('');

      if (result.success) {
        addLog('🎉 ✅ EMAIL SENT SUCCESSFULLY!');
        addLog(`🎫 Message ID: ${result.messageId}`);
        addLog('');
        addLog('📨 Check your inbox (and spam folder)!');
      } else {
        addLog('❌ EMAIL FAILED TO SEND');
        addLog('');
        addLog('👀 Error Details:');
        addLog(`   Error: ${result.error}`);
        if ((result as any).debug) {
          addLog(`   Debug: ${JSON.stringify((result as any).debug, null, 2)}`);
        }
        if ((result as any).errorDetails) {
          addLog(`   Details: ${JSON.stringify((result as any).errorDetails, null, 2)}`);
        }
        addLog('');
        addLog('💡 Check backend logs for more details');
      }
    } catch (error: any) {
      addLog('💥 EXCEPTION CAUGHT');
      addLog('');
      addLog('🔍 Error Analysis:');
      addLog(`   Type: ${typeof error}`);
      addLog(`   Constructor: ${error?.constructor?.name || 'unknown'}`);
      addLog(`   Keys: ${error ? Object.keys(error).join(', ') : 'none'}`);
      addLog('');
      addLog(`   Message: ${error?.message || 'none'}`);
      addLog(`   Data: ${JSON.stringify(error?.data, null, 2)}`);
      addLog(`   Cause: ${error?.cause || 'none'}`);
      addLog('');
      addLog('📜 Full Error:');
      addLog(JSON.stringify(error, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  const testBackendHealth = async () => {
    setIsLoading(true);
    addLog('🔄 Testing backend health...');
    addLog('');

    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET';
      addLog('🌐 Backend URL:');
      addLog(`   ${baseUrl}`);
      addLog('');
      addLog('📡 Sending request...');

      const response = await fetch(`${baseUrl}/`);
      const data = await response.json();
      
      addLog('✅ Backend is reachable!');
      addLog('');
      addLog('📊 Health Status:');
      addLog(`   Status: ${data.status}`);
      addLog(`   Message: ${data.message}`);
      addLog(`   Timestamp: ${data.timestamp}`);
      addLog('');
      addLog('⚙️ Environment:');
      addLog(`   Resend Configured: ${data.env?.resend_configured ? '✅ YES' : '❌ NO'}`);
      addLog(`   Node Env: ${data.env?.node_env || 'unknown'}`);
      addLog('');
      
      if (!data.env?.resend_configured) {
        addLog('⚠️ WARNING: Resend is NOT configured!');
        addLog('');
        addLog('🔧 Fix:');
        addLog('   1. Set RESEND_API_KEY in backend environment');
        addLog('   2. Restart the backend');
        addLog('   3. See QUICK_EMAIL_FIX.md for instructions');
      } else {
        addLog('✅ Resend is configured correctly');
      }
      
      addLog('');
      addLog('📝 Full Response:');
      addLog(JSON.stringify(data, null, 2));
    } catch (error: any) {
      addLog('❌ Backend health check failed');
      addLog('');
      addLog(`Error: ${error?.message || String(error)}`);
      addLog('');
      addLog('💡 Possible causes:');
      addLog('   - Backend is not running');
      addLog('   - Wrong URL in EXPO_PUBLIC_RORK_API_BASE_URL');
      addLog('   - Network/CORS issue');
    } finally {
      setIsLoading(false);
    }
  };

  const testEmailEndpoint = async () => {
    setIsLoading(true);
    addLog('🔄 Testing direct /api/test-email endpoint...');
    addLog('');

    try {
      const baseUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || 'NOT SET';
      const url = `${baseUrl}/api/test-email?to=${email}&subject=Debug Test&text=This is a debug test`;
      
      addLog('🌐 Making request to:');
      addLog(`   ${url}`);
      addLog('');

      const response = await fetch(url);
      const data = await response.json();
      
      addLog(`📦 Response:`);
      addLog(`   Status: ${response.status} ${response.statusText}`);
      addLog(`   OK: ${response.ok}`);
      addLog('');
      addLog('📝 Data:');
      addLog(JSON.stringify(data, null, 2));
      addLog('');
      
      if (data.success) {
        addLog('✅ 🎉 EMAIL SENT!');
        addLog(`   Message ID: ${data.messageId}`);
      } else {
        addLog('❌ EMAIL FAILED');
        addLog(`   Error: ${data.error}`);
        if (data.debug) {
          addLog('');
          addLog('👀 Debug Info:');
          addLog(JSON.stringify(data.debug, null, 2));
        }
      }
    } catch (error: any) {
      addLog('❌ 💥 Request failed');
      addLog('');
      addLog(`Error: ${error?.message || String(error)}`);
      addLog(`Stack: ${error?.stack || 'none'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Email Debug Tool' }} />
      
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <LinearGradient
          colors={['#1a1f3a', '#2d3561']}
          style={styles.gradient}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Environment Check</Text>
              <Text style={styles.envText}>
                Base URL: {process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '❌ NOT SET'}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Test Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TouchableOpacity
                style={styles.button}
                onPress={testEmail}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Testing...' : 'Test tRPC Email Send'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={testEmailEndpoint}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  Test Direct Email Endpoint
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={testBackendHealth}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>
                  Test Backend Health
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <View style={styles.logsHeader}>
                <Text style={styles.sectionTitle}>Logs</Text>
                <TouchableOpacity onPress={() => setLogs([])}>
                  <Text style={styles.clearButton}>Clear</Text>
                </TouchableOpacity>
              </View>
              
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#5b8cde" size="large" />
                </View>
              )}

              {logs.length === 0 ? (
                <Text style={styles.noLogs}>No logs yet. Run a test!</Text>
              ) : (
                logs.map((log, index) => (
                  <Text key={index} style={styles.logText}>
                    {log}
                  </Text>
                ))
              )}
            </View>

            <TouchableOpacity
              style={[styles.button, styles.buttonBack]}
              onPress={() => router.back()}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#fff',
    marginBottom: 12,
  },
  envText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontFamily: 'monospace',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#5b8cde',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(91, 140, 222, 0.5)',
  },
  buttonBack: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#fff',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  clearButton: {
    fontSize: 14,
    color: '#ff8a4c',
    fontWeight: '600' as const,
  },
  noLogs: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
    paddingVertical: 20,
  },
  logText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
    fontFamily: 'monospace',
    marginBottom: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
