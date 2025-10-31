import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { useSchema } from '@/contexts/SchemaContext';

interface Props {
  testID?: string;
}

export default function MigrationBanner({ testID = 'migration-banner' }: Props) {
  const { hasSubscriptionTier, hasLevel, isChecking, refresh } = useSchema();

  const visible = useMemo(() => !hasSubscriptionTier || !hasLevel, [hasSubscriptionTier, hasLevel]);
  if (!visible) return null;

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.row}>
        <AlertCircle size={18} color="#111827" />
        <Text style={styles.text} numberOfLines={2}>
          Data model changed. Run DB migrations to add missing columns
          {!hasSubscriptionTier ? ' (subscription_tier)' : ''}
          {!hasLevel ? ' (level)' : ''}.
        </Text>
        <Pressable
          onPress={refresh}
          disabled={isChecking}
          style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
          testID="migration-refresh"
        >
          <RefreshCw size={16} color="#111827" />
          <Text style={styles.refreshText}>{isChecking ? '...' : 'Recheck'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 12 : 12,
    left: 12,
    right: 12,
    backgroundColor: '#FDE68A',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    color: '#111827',
    fontSize: 13,
    fontWeight: '600' as const,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#FCD34D',
    borderRadius: 8,
  },
  pressed: { opacity: 0.7 },
  refreshText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
