import { storage } from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useState, useMemo, useRef } from 'react';

export type Personality = 'introvert' | 'extrovert' | 'ambivert';
export type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'anytime';

export interface OnboardingPreferences {
  goal: string;
  personality: Personality;
  dailyQuests: number;
  preferredTime: PreferredTime;
  completed: boolean;
}

const DEFAULT_PREFS: OnboardingPreferences = {
  goal: 'Build resilience to rejection',
  personality: 'ambivert',
  dailyQuests: 2,
  preferredTime: 'anytime',
  completed: false,
};

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const [prefs, setPrefs] = useState<OnboardingPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const load = async () => {
      try {
        const timeoutPromise = new Promise<string | null>((_, reject) => {
          setTimeout(() => reject(new Error('Onboarding load timeout')), 1000);
        });

          const storagePromise = storage.getItem('onboarding');
        
        const raw = await Promise.race([storagePromise, timeoutPromise]);
        
        if (raw) {
          try {
            const parsed = JSON.parse(raw as string) as OnboardingPreferences;
            if (mountedRef.current) setPrefs({ ...DEFAULT_PREFS, ...parsed });
          } catch (parseError) {
            console.error('[OnboardingContext] Invalid JSON in storage, clearing corrupted data:', parseError);
            await storage.removeItem('onboarding');
          }
        }
      } catch (e) {
        console.log('Using default onboarding prefs:', e instanceof Error ? e.message : 'unknown error');
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };
    
    timeoutId = setTimeout(load, 0);

    return () => {
      mountedRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingPreferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch } as OnboardingPreferences;
          storage.setItem('onboarding', JSON.stringify(next)).catch((e) =>
        console.error('Failed to persist onboarding', e)
      );
      return next;
    });
  }, []);

  const complete = useCallback(async () => {
    setPrefs((p) => {
      const next = { ...p, completed: true };
          storage.setItem('onboarding', JSON.stringify(next)).catch((e) =>
        console.error('Failed to persist onboarding completion', e)
      );
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    setPrefs(DEFAULT_PREFS);
    await storage.setItem('onboarding', JSON.stringify(DEFAULT_PREFS));
  }, []);

  return useMemo(
    () => ({ prefs, isLoading, update, complete, reset }),
    [prefs, isLoading, update, complete, reset]
  );
});
