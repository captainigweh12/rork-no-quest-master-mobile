import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useState } from 'react';
import { Stack } from 'expo-router';
import { getBaseUrl } from '@/lib/baseUrl';

export default function TestLiveAPI() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const baseUrl = getBaseUrl();

  const testEndpoint = async (name: string, url: string) => {
    setLoading(true);
    const timestamp = new Date().toLocaleTimeString();
    
    try {
      console.log(`[Test ${name}] Fetching ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      setResults(prev => [{
        timestamp,
        name,
        url,
        status: response.status,
        ok: response.ok,
        data: typeof data === 'string' ? data.substring(0, 500) : data,
      }, ...prev]);
      
      console.log(`[Test ${name}] Response:`, response.status, data);
    } catch (error) {
      console.error(`[Test ${name}] Error:`, error);
      setResults(prev => [{
        timestamp,
        name,
        url,
        status: 'ERROR',
        ok: false,
        data: error instanceof Error ? error.message : String(error),
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const runAllTests = async () => {
    setResults([]);
    await testEndpoint('Root', `${baseUrl}/`);
    await testEndpoint('API Root', `${baseUrl}/api`);
    await testEndpoint('Health', `${baseUrl}/api/health`);
    await testEndpoint('tRPC Routes', `${baseUrl}/api/trpc-routes`);
    await testEndpoint('VideoSDK Config', `${baseUrl}/api/trpc/videosdk.checkConfig`);
    await testEndpoint('VideoSDK Token', `${baseUrl}/api/trpc/videosdk.getToken`);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Live API Test', headerBackTitle: 'Back' }} />
      
      <View style={styles.header}>
        <Text style={styles.title}>Live Streaming API Test</Text>
        <Text style={styles.baseUrl}>Base URL: {baseUrl}</Text>
        
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={runAllTests}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Run All Tests</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {results.length === 0 ? (
          <Text style={styles.emptyText}>No tests run yet. Press "Run All Tests" to start.</Text>
        ) : (
          results.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <Text style={styles.resultName}>{result.name}</Text>
                <Text style={styles.resultTime}>{result.timestamp}</Text>
              </View>
              
              <Text style={styles.resultUrl} numberOfLines={1} ellipsizeMode="tail">
                {result.url}
              </Text>
              
              <View style={styles.statusRow}>
                <View style={[
                  styles.statusBadge,
                  result.ok ? styles.statusSuccess : styles.statusError
                ]}>
                  <Text style={styles.statusText}>
                    {result.status}
                  </Text>
                </View>
                <Text style={[
                  styles.okBadge,
                  result.ok ? styles.okSuccess : styles.okError
                ]}>
                  {result.ok ? '✓ OK' : '✗ FAIL'}
                </Text>
              </View>
              
              <View style={styles.dataContainer}>
                <Text style={styles.dataLabel}>Response:</Text>
                <Text style={styles.dataText}>
                  {typeof result.data === 'object' 
                    ? JSON.stringify(result.data, null, 2) 
                    : result.data}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    padding: 20,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  baseUrl: {
    fontSize: 12,
    color: '#888',
    marginBottom: 16,
    fontFamily: 'monospace' as any,
  },
  button: {
    backgroundColor: '#007AFF',
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
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 40,
  },
  resultCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  resultTime: {
    fontSize: 12,
    color: '#666',
  },
  resultUrl: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace' as any,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusSuccess: {
    backgroundColor: '#00AA00',
  },
  statusError: {
    backgroundColor: '#CC0000',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  okBadge: {
    fontSize: 12,
    fontWeight: '600',
  },
  okSuccess: {
    color: '#00FF00',
  },
  okError: {
    color: '#FF0000',
  },
  dataContainer: {
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 12,
  },
  dataLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  dataText: {
    fontSize: 11,
    color: '#ccc',
    fontFamily: 'monospace' as any,
  },
});
