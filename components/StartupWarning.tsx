import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { AlertCircle, ExternalLink } from 'lucide-react-native';

export function StartupWarning() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  
  const hasInvalidCredentials = !url || !anon || url.includes('YOUR-PROJECT') || anon.includes('YOUR_');
  
  if (!hasInvalidCredentials) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.warning}>
        <AlertCircle size={24} color="#F59E0B" />
        <View style={styles.content}>
          <Text style={styles.title}>⚠️ Configuration Required</Text>
          <Text style={styles.message}>
            Your Supabase credentials are not configured. Please update your .env file with actual values.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => Linking.openURL('https://app.supabase.com')}
          >
            <Text style={styles.buttonText}>Open Supabase Dashboard</Text>
            <ExternalLink size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.instructions}>
            1. Get your Project URL and anon key from Supabase{'\n'}
            2. Update .env file in project root{'\n'}
            3. Restart the development server
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 20,
  },
  warning: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: '700' as const,
  },
  message: {
    color: '#E5E7EB',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  instructions: {
    color: '#9CA3AF',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
