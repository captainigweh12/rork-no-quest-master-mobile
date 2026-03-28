import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Schema check timeout')), 3000);
        });
        
        const queryPromise = supabase
          .from('user_profiles')
          .select(column)
          .limit(1);
        
        try {
          const { error } = await Promise.race([queryPromise, timeoutPromise]) as any;
          if (error && (error as any).code === '42703') {
            return false;
          }
          return true;
        } catch {
          console.warn('[SCHEMA] Probe timeout for column:', column);
          return true;
        }
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
      console.warn('[SCHEMA] Check failed:', code);
      setErrorCode(String(code));
      setHasSubscriptionTier(true);
      setHasLevel(true);
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(() => ({
    hasSubscriptionTier,
    hasLevel,
    lastCheckedAt,
    isChecking,
    errorCode,
    refresh: check,
  }), [hasSubscriptionTier, hasLevel, lastCheckedAt, isChecking, errorCode, check]);
});
