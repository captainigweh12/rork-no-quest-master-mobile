import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getBaseUrl, getDefaultBaseUrl } from '@/lib/baseUrl';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DebugBaseUrlScreen() {
  const insets = useSafeAreaInsets();
  const [currentUrl, setCurrentUrl] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [storageCleared, setStorageCleared] = useState(false);
  const [envUrl, setEnvUrl] = useState('');

  const loadUrls = async () => {
    const current = getBaseUrl();
    const defaultVal = getDefaultBaseUrl();
    const env = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

    setCurrentUrl(current);
    setDefaultUrl(defaultVal);
    setEnvUrl(env);
  };

  useEffect(() => {
    loadUrls();
  }, []);

  const handleClearCache = async () => {
    try {
      await AsyncStorage.removeItem('EXPO_PUBLIC_RORK_API_BASE_URL_OVERRIDE');
      setStorageCleared(true);
      Alert.alert(
        '✅ Storage cleared!',
        'Will use .env URL: ' + process.env.EXPO_PUBLIC_RORK_API_BASE_URL + '\n\nPlease close and restart the app manually to apply changes.',
        [{ text: 'OK' }]
      );
      await loadUrls();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const testConnection = async () => {
    try {
      const url = `${currentUrl}/api/health`;
      console.log('[Debug] Testing connection to:', url);
      const response = await fetch(url);
      await response.json();
      Alert.alert(
        'Connection Test',
        response.ok ? '✅ Backend is reachable!' : '❌ Backend returned error',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert('Connection Failed', error.message);
    }
  };

  const viewAsyncStorage = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      const storage = items.map(([key, value]) => `${key}: ${value}`).join('\n\n');
      Alert.alert('AsyncStorage Contents', storage || '(empty)', [{ text: 'OK' }]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'API Debug',
          headerStyle: { backgroundColor: '#1a1f3a' },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <Text style={styles.title}>API Connection Debug</Text>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Current Base URL:</Text>
          <Text style={styles.value}>{currentUrl}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.label}>Default (from .env):</Text>
          <Text style={styles.value}>{envUrl || defaultUrl}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, styles.clearButton]}
          onPress={handleClearCache}
        >
          <Text style={styles.buttonText}>🧹 Clear Cache & Set Render URL</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.testButton]}
          onPress={testConnection}
        >
          <Text style={styles.buttonText}>Test Connection</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]}
          onPress={viewAsyncStorage}
        >
          <Text style={styles.buttonTextSecondary}>📦 View AsyncStorage</Text>
        </TouchableOpacity>

        {storageCleared && (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successText}>Storage cleared!</Text>
            <Text style={styles.successSubtext}>
              Will use .env URL: {process.env.EXPO_PUBLIC_RORK_API_BASE_URL}
            </Text>
            <Text style={styles.warningText}>
              Please close and restart the app manually (swipe away from recents).
            </Text>
          </View>
        )}

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>ℹ️ Instructions</Text>
          <Text style={styles.helpText}>
            1. Tap &ldquo;Clear Cache & Set Render URL&rdquo; above{'\n'}
            2. Wait for confirmation{'\n'}
            3. Close the app completely (swipe away from recents){'\n'}
            4. Reopen the app{'\n'}
            {'\n'}
            The app will now use the Render URL from .env:{'\n'}
            {envUrl}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#1a1f3a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  clearButton: {
    backgroundColor: '#10b981',
  },
  testButton: {
    backgroundColor: '#3b82f6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#64748b',
  },
  buttonTextSecondary: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#10b981',
    padding: 20,
    borderRadius: 8,
    marginVertical: 20,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  successText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 5,
  },
  successSubtext: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  helpBox: {
    backgroundColor: '#1a1f3a',
    padding: 20,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B2C',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
});
