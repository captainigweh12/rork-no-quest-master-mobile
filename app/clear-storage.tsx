import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';
import { setBaseUrlOverride, getBaseUrl, getDefaultBaseUrl } from '@/lib/baseUrl';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClearStorageScreen() {
  const [currentBase, setCurrentBase] = useState(getBaseUrl());
  const [defaultBase] = useState(getDefaultBaseUrl());

  async function handleClearOverride() {
    try {
      await setBaseUrlOverride(undefined);
      await AsyncStorage.clear();
      setCurrentBase(getBaseUrl());
      Alert.alert('Success', 'Cleared all storage and base URL override. Please restart the app.');
    } catch (error) {
      Alert.alert('Error', String(error));
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Storage Debug</Text>
      
      <View style={styles.section}>
        <Text style={styles.label}>Current Base URL:</Text>
        <Text style={styles.value}>{currentBase}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Default (from env):</Text>
        <Text style={styles.value}>{defaultBase}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleClearOverride}>
        <Text style={styles.buttonText}>Clear All Storage & Override</Text>
      </TouchableOpacity>
    </View>
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
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
