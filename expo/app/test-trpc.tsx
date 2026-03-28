import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import { getBaseUrl } from '@/lib/baseUrl';

export default function TestTRPCScreen() {
  const insets = useSafeAreaInsets();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (test: string, success: boolean, data?: any) => {
    setTestResults(prev => [...prev, { test, success, data, timestamp: new Date().toISOString() }]);
  };

  const testBaseUrl = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      addResult('Get Base URL', true, { baseUrl });
      
      const response = await fetch(baseUrl);
      const data = await response.json();
      addResult('Fetch Root (/)', response.ok, { status: response.status, data });
    } catch (error: any) {
      addResult('Fetch Root (/)', false, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testApiEndpoint = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const apiUrl = `${baseUrl}/api`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      addResult('Fetch /api', response.ok, { status: response.status, data });
    } catch (error: any) {
      addResult('Fetch /api', false, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testHealthEndpoint = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const healthUrl = `${baseUrl}/api/health`;
      
      const response = await fetch(healthUrl);
      const data = await response.json();
      addResult('Fetch /api/health', response.ok, { status: response.status, data });
    } catch (error: any) {
      addResult('Fetch /api/health', false, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const hiMutation = trpc.example.hi.useMutation({
    onSuccess: (data: any) => {
      addResult('tRPC Mutation Success', true, { data });
      setIsLoading(false);
    },
    onError: (error: any) => {
      addResult('tRPC Mutation Error', false, { error: error.message });
      setIsLoading(false);
    }
  });

  const runTRPCTest = () => {
    setIsLoading(true);
    addResult('tRPC Mutation Started', true, { info: 'Testing example.hi mutation' });
    hiMutation.mutate({ name: 'Test User' });
  };

  const testVideoSDKConfig = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/trpc/videosdk.checkConfig`;
      
      const response = await fetch(url);
      const data = await response.json();
      addResult('VideoSDK Config Check', response.ok, { status: response.status, data });
    } catch (error: any) {
      addResult('VideoSDK Config Check', false, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const testVideoSDKToken = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getBaseUrl();
      const url = `${baseUrl}/api/trpc/videosdk.getToken`;
      
      const response = await fetch(url);
      const data = await response.json();
      addResult('VideoSDK Get Token', response.ok, { status: response.status, data });
    } catch (error: any) {
      addResult('VideoSDK Get Token', false, { error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Test tRPC Connection' }} />
      
      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={styles.title}>Backend Connection Test</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Base URL:</Text>
          <Text style={styles.infoValue}>{getBaseUrl()}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>tRPC Endpoint:</Text>
          <Text style={styles.infoValue}>{getBaseUrl()}/api/trpc</Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={testBaseUrl}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>1. Test Root (/)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testApiEndpoint}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>2. Test /api</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testHealthEndpoint}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>3. Test /api/health</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={runTRPCTest}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, styles.primaryButtonText]}>
              4. Test tRPC Mutation
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testVideoSDKConfig}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>5. Test VideoSDK Config</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testVideoSDKToken}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>6. Test VideoSDK Token</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearResults}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Clear Results</Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B2C" />
            <Text style={styles.loadingText}>Testing...</Text>
          </View>
        )}

        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Test Results:</Text>
          {testResults.length === 0 ? (
            <Text style={styles.noResults}>No tests run yet. Click a button above to start.</Text>
          ) : (
            testResults.map((result, index) => (
              <View
                key={index}
                style={[
                  styles.resultItem,
                  result.success ? styles.resultSuccess : styles.resultError
                ]}
              >
                <Text style={styles.resultTest}>{result.test}</Text>
                <Text style={styles.resultStatus}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </Text>
                {result.data && (
                  <Text style={styles.resultData}>
                    {JSON.stringify(result.data, null, 2)}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    color: '#1a1a1a',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 10,
  },
  button: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  primaryButton: {
    backgroundColor: '#FF6B2C',
    borderColor: '#FF6B2C',
  },
  clearButton: {
    backgroundColor: '#666',
    borderColor: '#666',
    marginTop: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  primaryButtonText: {
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  resultsContainer: {
    marginTop: 30,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  noResults: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  resultItem: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  resultSuccess: {
    backgroundColor: '#d4edda',
    borderWidth: 1,
    borderColor: '#c3e6cb',
  },
  resultError: {
    backgroundColor: '#f8d7da',
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  resultTest: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#1a1a1a',
  },
  resultStatus: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  resultData: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#555',
    marginTop: 5,
  },
});
