import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { getBaseUrl, getDefaultBaseUrl, setBaseUrlOverride, loadBaseUrlOverride } from '@/lib/baseUrl';
import { Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function DebugBaseUrlScreen() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');
  const [overrideUrl, setOverrideUrl] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [envUrl, setEnvUrl] = useState('');

  const loadUrls = async () => {
    const current = getBaseUrl();
    const defaultVal = getDefaultBaseUrl();
    const override = await loadBaseUrlOverride();
    const env = process.env.EXPO_PUBLIC_RORK_API_BASE_URL || '';

    setCurrentUrl(current);
    setDefaultUrl(defaultVal);
    setOverrideUrl(override || '(none)');
    setEnvUrl(env);
  };

  useEffect(() => {
    loadUrls();
  }, []);

  const handleClearOverride = async () => {
    try {
      await setBaseUrlOverride(undefined);
      Alert.alert('Success', 'Base URL override cleared. Please restart the app.');
      await loadUrls();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSetOverride = async () => {
    if (!newUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }
    try {
      await setBaseUrlOverride(newUrl.trim());
      Alert.alert('Success', 'Base URL override set. Please restart the app.');
      await loadUrls();
      setNewUrl('');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleClearAll = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Success', 'All AsyncStorage data cleared. Please restart the app.');
      await loadUrls();
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Debug Base URL',
          headerStyle: { backgroundColor: '#1a1f3a' },
          headerTintColor: '#fff',
        }} 
      />
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Configuration</Text>
          
          <View style={styles.infoBox}>
            <Text style={styles.label}>Current Base URL:</Text>
            <Text style={styles.value}>{currentUrl}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Default Base URL:</Text>
            <Text style={styles.value}>{defaultUrl}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>Environment (.env):</Text>
            <Text style={styles.value}>{envUrl || '(not set)'}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.label}>AsyncStorage Override:</Text>
            <Text style={[styles.value, overrideUrl !== '(none)' && styles.warning]}>
              {overrideUrl}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected tRPC Endpoint</Text>
          <View style={styles.infoBox}>
            <Text style={styles.value}>{currentUrl}/api/trpc</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleClearOverride}
          >
            <Text style={styles.buttonText}>Clear AsyncStorage Override</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.dangerButton]}
            onPress={handleClearAll}
          >
            <Text style={styles.buttonText}>Clear All AsyncStorage (⚠️ Danger)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]}
            onPress={loadUrls}
          >
            <Text style={styles.buttonTextSecondary}>Refresh Values</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set Custom Override</Text>
          <TextInput
            style={styles.input}
            value={newUrl}
            onChangeText={setNewUrl}
            placeholder="Enter base URL (e.g., https://example.com)"
            placeholderTextColor="#999"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity 
            style={styles.button}
            onPress={handleSetOverride}
          >
            <Text style={styles.buttonText}>Set Override</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>📝 How to fix the 404 error:</Text>
          <Text style={styles.helpText}>
            1. Make sure your backend is running (bun run backend:dev){'\n'}
            2. Make sure your tunnel is active{'\n'}
            3. Update .env with the tunnel URL{'\n'}
            4. Clear the AsyncStorage override above{'\n'}
            5. Restart the app{'\n'}
            {'\n'}
            Current tunnel from previous messages:{'\n'}
            https://dc63b949bffabc.lhr.life
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
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 15,
  },
  infoBox: {
    backgroundColor: '#1a1f3a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontFamily: 'monospace',
  },
  warning: {
    color: '#ff6b6b',
  },
  input: {
    backgroundColor: '#1a1f3a',
    color: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#FF6B2C',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF6B2C',
  },
  buttonTextSecondary: {
    color: '#FF6B2C',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
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
