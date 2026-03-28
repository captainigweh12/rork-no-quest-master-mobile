import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { checkAndApplyUpdates, getCurrentUpdateInfo } from '@/lib/updateManager.native';
import Constants from 'expo-constants';

interface UpdateInfoDisplay {
  mode: string;
  otaEnabled?: boolean;
  updateId?: string | null;
  runtimeVersion?: string | null;
  isEmbeddedLaunch?: boolean;
  manifest?: any;
  error?: string;
}

export default function UpdateDebugScreen() {
  const { theme } = useTheme();
  const [info, setInfo] = useState<UpdateInfoDisplay | null>(null);
  const [checking, setChecking] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const data = getCurrentUpdateInfo() as UpdateInfoDisplay;
    setInfo(data);
  }, []);

  const hardOff = Boolean(Constants.expoConfig?.extra?.alwaysDisableOta);
  const otaEnabled = Boolean(Constants.expoConfig?.extra?.otaEnabled) && !hardOff;

  const handleManualCheck = async () => {
    if (!otaEnabled) {
      setResultMsg('OTA disabled; manual check skipped.');
      return;
    }
    setChecking(true);
    setResultMsg(null);
    try {
      await checkAndApplyUpdates();
      setResultMsg('Check completed (see console for details).');
    } catch (e: any) {
      setResultMsg('Manual check error: ' + (e?.message || String(e)));
    } finally {
      setChecking(false);
      // Refresh info after potential reload
      const data = getCurrentUpdateInfo() as UpdateInfoDisplay;
      setInfo(data);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Update Debug</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Runtime diagnostics for Expo Updates</Text>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Flags</Text>
        <Row label="OTA Enabled" value={String(otaEnabled)} />
        <Row label="Hard Off (alwaysDisableOta)" value={String(hardOff)} />
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}> 
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Info</Text>
        {info ? (
          <>
            <Row label="Mode" value={String(info.mode)} />
            {info.updateId !== undefined && <Row label="Update ID" value={String(info.updateId)} />}
            {info.runtimeVersion !== undefined && <Row label="Runtime Version" value={String(info.runtimeVersion)} />}
            {info.isEmbeddedLaunch !== undefined && <Row label="Embedded Launch" value={String(info.isEmbeddedLaunch)} />}
            {info.manifest && <Row label="Manifest Keys" value={Object.keys(info.manifest).length.toString()} />}
            {info.error && <Row label="Error" value={info.error} />}
          </>
        ) : (
          <Text style={{ color: theme.colors.textSecondary }}>Loading info…</Text>
        )}
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: otaEnabled ? theme.colors.primary : theme.colors.border }]}
        disabled={!otaEnabled || checking}
        onPress={handleManualCheck}
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>{checking ? 'Checking…' : otaEnabled ? 'Manual Update Check' : 'OTA Disabled'}</Text>
      </Pressable>

      {resultMsg && (
        <View style={styles.messageBox}>
          <Text style={{ color: theme.colors.textSecondary }}>{resultMsg}</Text>
        </View>
      )}

      <View style={{ marginTop: 32 }}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Re-enable OTA (Summary)</Text>
        <Text style={[styles.paragraph, { color: theme.colors.textSecondary }]}>Set OTA_ENABLED=true and remove ALWAYS_DISABLE_OTA from the desired build profile in eas.json; restore the update job in the workflow.</Text>
      </View>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}> 
      <Text style={[styles.rowLabel, { fontWeight: '600' }]}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 16 },
  card: { padding: 14, borderWidth: 1, borderRadius: 10, marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 14, opacity: 0.8 },
  button: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#FFFFFF', fontWeight: '600' },
  messageBox: { marginTop: 12, padding: 12, backgroundColor: '#00000010', borderRadius: 8 },
  paragraph: { fontSize: 13, lineHeight: 18, marginTop: 4 }
});
