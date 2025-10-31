import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export type SchemaHealth = {
  hasSubscriptionTier: boolean;
  hasLevel: boolean;
  lastCheckedAt?: string;
  isChecking: boolean;
  errorCode?: string;
  refresh: () => Promise<void>;
};

export const [SchemaProvider, useSchema] = createContextHook<SchemaHealth>(() => {
  const [hasSubscriptionTier, setHasSubscriptionTier] = useState<boolean>(true);
  const [hasLevel, setHasLevel] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | undefined>(undefined);

  const check = useCallback(async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const now = new Date().toISOString();
      setLastCheckedAt(now);

      const probe = async (column: string) => {
        const { error } = await supabase
          .from('user_profiles')
          .select(column)
          .limit(1);
        if (error && (error as any).code === '42703') {
          return false;
        }
        return true;
      };

      const [tierOk, levelOk] = await Promise.all([
        probe('subscription_tier'),
        probe('level'),
      ]);
      setHasSubscriptionTier(tierOk);
      setHasLevel(levelOk);
      setErrorCode(undefined);
    } catch (e: any) {
      const code = e?.code || e?.message || 'unknown';
      setErrorCode(String(code));
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    setTimeout(() => {
      check();
    }, Platform.OS === 'web' ? 0 : 0);
  }, [check]);

  return useMemo(() => ({
    hasSubscriptionTier,
    hasLevel,
    lastCheckedAt,
    isChecking,
    errorCode,
    refresh: check,
  }), [hasSubscriptionTier, hasLevel, lastCheckedAt, isChecking, errorCode, check]);
});
