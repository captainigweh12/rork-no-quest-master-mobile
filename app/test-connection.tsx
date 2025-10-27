import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function TestConnectionScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const router = useRouter();

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testConnection = async () => {
    setTesting(true);
    setResults([]);

    addResult('🔍 Starting connection test...');

    try {
      addResult('📡 Testing Supabase connection...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (error) {
        addResult(`❌ Database error: ${error.message}`);
        addResult(`Error code: ${error.code}`);
        addResult(`Error hint: ${error.hint || 'none'}`);
      } else {
        addResult('✅ Successfully connected to Supabase!');
        addResult(`Response: ${JSON.stringify(data)}`);
      }
    } catch (err: any) {
      addResult(`❌ Connection failed: ${err.message}`);
      addResult(`Error type: ${err.name}`);
      addResult(`Stack: ${err.stack?.substring(0, 200)}`);
    }

    try {
      addResult('🔐 Testing auth...');
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        addResult(`❌ Auth error: ${authError.message}`);
      } else {
        addResult(`✅ Auth check complete. Session: ${session ? 'Active' : 'None'}`);
      }
    } catch (err: any) {
      addResult(`❌ Auth failed: ${err.message}`);
    }

    addResult('✅ Test complete');
    setTesting(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>Connection Test</Text>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Supabase Config</Text>
        <Text style={styles.infoText}>URL: {process.env.EXPO_PUBLIC_SUPABASE_URL || 'Not set'}</Text>
        <Text style={styles.infoText}>Key: {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '❌ Not set'}</Text>
      </View>

      <Pressable
        style={[styles.button, testing && styles.buttonDisabled]}
        onPress={testConnection}
        disabled={testing}
      >
        {testing ? (
          <>
            <ActivityIndicator color="#FFFFFF" />
            <Text style={styles.buttonText}>Testing...</Text>
          </>
        ) : (
          <Text style={styles.buttonText}>Test Connection</Text>
        )}
      </Pressable>

      <ScrollView style={styles.resultsContainer} contentContainerStyle={styles.resultsContent}>
        <Text style={styles.resultsTitle}>Results:</Text>
        {results.map((result, index) => (
          <Text key={index} style={styles.resultText}>{result}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
  },
  resultsContent: {
    paddingBottom: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 12,
  },
  resultText: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
    fontFamily: 'monospace' as const,
  },
});
