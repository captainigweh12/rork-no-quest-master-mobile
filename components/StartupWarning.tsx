import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';
import { AlertCircle, ExternalLink, CheckCircle, XCircle, RefreshCw } from 'lucide-react-native';
import { testSupabaseConnection } from '@/lib/test-connection';

export function StartupWarning() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
  
  const hasInvalidCredentials = !url || !anon || url.includes('YOUR-PROJECT') || anon.includes('YOUR_');
  
  const [connectionTest, setConnectionTest] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
  }>({ tested: false, success: false, message: '' });
  
  useEffect(() => {
    if (!hasInvalidCredentials) {
      testSupabaseConnection(url).then(result => {
        setConnectionTest({
          tested: true,
          success: result.success,
          message: result.message,
        });
      });
    }
  }, [url, hasInvalidCredentials]);
  
  if (!hasInvalidCredentials && connectionTest.success) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.warning}>
        {hasInvalidCredentials ? (
          <AlertCircle size={24} color="#F59E0B" />
        ) : connectionTest.tested ? (
          connectionTest.success ? (
            <CheckCircle size={24} color="#10B981" />
          ) : (
            <XCircle size={24} color="#EF4444" />
          )
        ) : (
          <ActivityIndicator size="small" color="#F59E0B" />
        )}
        <View style={styles.content}>
          {hasInvalidCredentials ? (
            <>
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
            </>
          ) : !connectionTest.tested ? (
            <>
              <Text style={styles.title}>Testing Connection...</Text>
              <Text style={styles.message}>Verifying connection to Supabase...</Text>
            </>
          ) : !connectionTest.success ? (
            <>
              <Text style={[styles.title, { color: '#EF4444' }]}>❌ Connection Failed</Text>
              <Text style={styles.message}>{connectionTest.message}</Text>
              <Text style={styles.instructions}>
                Possible solutions:{' \n'}
                1. Check your internet connection{' \n'}
                2. Verify Supabase URL is correct in .env{' \n'}
                3. Check if Supabase project is active{' \n'}
                4. Restart the development server{' \n'}
                5. If on mobile, ensure device has internet access
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  setConnectionTest({ tested: false, success: false, message: '' });
                  testSupabaseConnection(url).then(result => {
                    setConnectionTest({
                      tested: true,
                      success: result.success,
                      message: result.message,
                    });
                  });
                }}
              >
                <RefreshCw size={16} color="#FFFFFF" />
                <Text style={styles.buttonText}>Retry Connection</Text>
              </TouchableOpacity>
            </>
          ) : null}
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
