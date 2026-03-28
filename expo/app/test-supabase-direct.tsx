import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

function DevTestSupabaseDirect() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log(message);
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addLog('🔍 Testing Supabase connection...');
      
      addLog(`📍 URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL}`);
      addLog(`🔑 Key present: ${!!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`);
      
      addLog('📡 Attempting simple query...');
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        addLog(`❌ Query error: ${error.message}`);
        addLog(`❌ Error code: ${error.code}`);
        addLog(`❌ Error details: ${JSON.stringify(error.details)}`);
      } else {
        addLog(`✅ Query successful! Rows: ${data?.length || 0}`);
      }
    } catch (err: any) {
      addLog(`💥 Exception: ${err.message}`);
      addLog(`💥 Error name: ${err.name}`);
      addLog(`💥 Stack: ${err.stack?.substring(0, 200)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSignUp = async () => {
    setIsLoading(true);
    setResults([]);
    
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'testpass123';
    
    try {
      addLog('📧 Testing signup...');
      addLog(`📍 Email: ${testEmail}`);
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: 'Test User',
          },
        },
      });
      
      if (error) {
        addLog(`❌ Signup error: ${error.message}`);
        addLog(`❌ Error status: ${error.status}`);
        addLog(`❌ Error name: ${error.name}`);
        if ('__isAuthError' in error) {
          addLog(`❌ Is Auth Error: true`);
        }
      } else {
        addLog(`✅ Signup successful!`);
        addLog(`✅ User ID: ${data.user?.id}`);
        addLog(`✅ Session: ${data.session ? 'Yes' : 'No (email confirmation required)'}`);
      }
    } catch (err: any) {
      addLog(`💥 Exception: ${err.message}`);
      addLog(`💥 Error name: ${err.name}`);
      addLog(`💥 Error toString: ${err.toString()}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testHealth = async () => {
    setIsLoading(true);
    setResults([]);
    
    try {
      addLog('🏥 Testing Supabase health...');
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'GET',
        headers: {
          'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        },
      });
      
      addLog(`📡 Response status: ${response.status}`);
      addLog(`📡 Response OK: ${response.ok}`);
      
      if (!response.ok) {
        const text = await response.text();
        addLog(`❌ Response text: ${text.substring(0, 200)}`);
      } else {
        addLog(`✅ Supabase is reachable!`);
      }
    } catch (err: any) {
      addLog(`💥 Fetch exception: ${err.message}`);
      addLog(`💥 Error name: ${err.name}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Test Supabase Connection', headerShown: true }} />
      
      <View style={styles.container}>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testHealth}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Health</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testConnection}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Query</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={testSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.clearButton, isLoading && styles.buttonDisabled]}
            onPress={() => setResults([])}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Clear Logs</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5b8cde" />
          </View>
        )}

        <ScrollView style={styles.resultsContainer}>
          {results.map((result, index) => (
            <Text key={index} style={styles.resultText}>
              {result}
            </Text>
          ))}
        </ScrollView>
      </View>
    </>
  );
}

function ProdBlocked() {
  return (
    <>
      <Stack.Screen options={{ title: 'Test Supabase Connection', headerShown: true }} />
      <View style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text>Not available in production</Text>
        </View>
      </View>
    </>
  );
}

export default function TestSupabaseDirect() {
  return (typeof __DEV__ !== 'undefined' && __DEV__ === true) ? <DevTestSupabaseDirect /> : <ProdBlocked />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#5b8cde',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#ff6b6b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 12,
  },
  resultText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: '#333',
  },
});
