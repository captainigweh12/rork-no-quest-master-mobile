import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { X, Check, Server, AlertCircle } from 'lucide-react-native';
import { getBaseUrl, getDefaultBaseUrl, setBaseUrlOverride } from '@/lib/baseUrl';
import { trpc } from '@/lib/trpc';

export default function BackendConfigScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [customUrl, setCustomUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [defaultUrl, setDefaultUrl] = useState('');

  useEffect(() => {
    const loadUrls = async () => {
      setCurrentUrl(getBaseUrl());
      setDefaultUrl(getDefaultBaseUrl());
    };
    loadUrls();
  }, []);

  const agoraEnvQuery = trpc.agora.env.useQuery(undefined, {
    retry: false,
    enabled: false,
  });

  const handleTest = async () => {
    try {
      await agoraEnvQuery.refetch();
      if (agoraEnvQuery.error) {
        Alert.alert('Connection Failed', `Error: ${agoraEnvQuery.error.message}`);
      } else {
        Alert.alert('Connection Success', 'Backend is reachable!');
      }
    } catch (error: any) {
      Alert.alert('Connection Failed', error?.message || 'Unknown error');
    }
  };

  const handleSetUrl = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    try {
      await setBaseUrlOverride(customUrl);
      setCurrentUrl(customUrl);
      Alert.alert('Success', 'Backend URL updated! Please reload the app.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to set URL');
    }
  };

  const handleClear = async () => {
    try {
      await setBaseUrlOverride(undefined);
      setCurrentUrl(getDefaultBaseUrl());
      setCustomUrl('');
      Alert.alert('Success', 'Backend URL cleared! Using default.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to clear URL');
    }
  };

  const styles = createStyles(theme.colors);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>Backend Configuration</Text>
        <Pressable
          style={styles.closeButton}
          onPress={() => router.back()}
          testID="close-button"
        >
          <X size={24} color={theme.colors.text} />
        </Pressable>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <View style={styles.cardHeader}>
            <Server size={24} color={theme.colors.primary} />
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Current Status</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Default URL:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]} selectable>
              {defaultUrl}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Current URL:</Text>
            <Text style={[styles.value, { color: theme.colors.text }]} selectable>
              {currentUrl}
            </Text>
          </View>

          {agoraEnvQuery.data && (
            <View style={[styles.statusBox, { backgroundColor: theme.colors.background }]}>
              <Text style={[styles.statusText, { color: theme.colors.success }]}>✓ Connected</Text>
              <Text style={[styles.statusDetail, { color: theme.colors.textSecondary }]}>
                Agora App ID: {agoraEnvQuery.data.appIdPresent ? '✓' : '✗'}
              </Text>
              <Text style={[styles.statusDetail, { color: theme.colors.textSecondary }]}>
                Customer ID: {agoraEnvQuery.data.customerIdPresent ? '✓' : '✗'}
              </Text>
            </View>
          )}

          {agoraEnvQuery.error && (
            <View style={[styles.statusBox, { backgroundColor: theme.colors.background }]}>
              <View style={styles.errorHeader}>
                <AlertCircle size={16} color={theme.colors.error} />
                <Text style={[styles.statusText, { color: theme.colors.error }]}>Connection Failed</Text>
              </View>
              <Text style={[styles.statusDetail, { color: theme.colors.textSecondary }]}>
                {agoraEnvQuery.error.message}
              </Text>
            </View>
          )}

          <Pressable
            style={[
              styles.testButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: agoraEnvQuery.isRefetching ? 0.6 : 1,
              },
            ]}
            onPress={handleTest}
            disabled={agoraEnvQuery.isRefetching}
            testID="test-connection-button"
          >
            <Text style={styles.testButtonText}>
              {agoraEnvQuery.isRefetching ? 'Testing...' : 'Test Connection'}
            </Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Set Custom Backend URL</Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.textSecondary }]}>
            Use localhost.run or ngrok tunnel URL
          </Text>

          <TextInput
            style={[styles.input, { 
              backgroundColor: theme.colors.background, 
              color: theme.colors.text,
              borderColor: theme.colors.border 
            }]}
            value={customUrl}
            onChangeText={setCustomUrl}
            placeholder="https://abc123.lhr.life"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            testID="url-input"
          />

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.primary, flex: 1 }]}
              onPress={handleSetUrl}
              testID="set-url-button"
            >
              <Check size={20} color="#fff" />
              <Text style={styles.buttonText}>Set URL</Text>
            </Pressable>

            <Pressable
              style={[styles.button, { backgroundColor: theme.colors.error, flex: 1 }]}
              onPress={handleClear}
              testID="clear-url-button"
            >
              <X size={20} color="#fff" />
              <Text style={styles.buttonText}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Instructions</Text>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            1. Start your backend locally: bun backend/server.ts
          </Text>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            2. Create tunnel: ssh -R 80:localhost:8081 nokey@localhost.run
          </Text>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            3. Copy the tunnel URL (e.g., https://abc123.lhr.life)
          </Text>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            4. Paste it above and click &quot;Set URL&quot;
          </Text>
          <Text style={[styles.instruction, { color: theme.colors.textSecondary }]}>
            5. Click &quot;Test Connection&quot; to verify
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: '800' as const,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
      gap: 20,
    },
    card: {
      padding: 20,
      borderRadius: 12,
      gap: 16,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '800' as const,
    },
    cardSubtitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      marginTop: -8,
    },
    infoRow: {
      gap: 4,
    },
    label: {
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase',
    },
    value: {
      fontSize: 14,
      fontWeight: '600' as const,
    },
    statusBox: {
      padding: 12,
      borderRadius: 8,
      gap: 6,
    },
    errorHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusText: {
      fontSize: 14,
      fontWeight: '800' as const,
    },
    statusDetail: {
      fontSize: 12,
      fontWeight: '600' as const,
    },
    testButton: {
      paddingVertical: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    testButtonText: {
      fontSize: 16,
      fontWeight: '800' as const,
      color: '#fff',
    },
    input: {
      height: 48,
      borderRadius: 8,
      paddingHorizontal: 16,
      fontSize: 14,
      fontWeight: '600' as const,
      borderWidth: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 12,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '800' as const,
      color: '#fff',
    },
    instruction: {
      fontSize: 13,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
  });
}
