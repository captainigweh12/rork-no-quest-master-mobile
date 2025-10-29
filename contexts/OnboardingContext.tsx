import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useState, useMemo } from 'react';

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

  useEffect(() => {
    const load = async () => {
      try {
        const timeoutPromise = new Promise<string | null>((_, reject) => {
          setTimeout(() => reject(new Error('Onboarding load timeout')), 3000);
        });

        const storagePromise = AsyncStorage.getItem('onboarding');
        
        const raw = await Promise.race([storagePromise, timeoutPromise]);
        
        if (raw) {
          const parsed = JSON.parse(raw as string) as OnboardingPreferences;
          setPrefs({ ...DEFAULT_PREFS, ...parsed });
        }
      } catch (e) {
        console.error('Failed to load onboarding prefs', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const update = useCallback(async (patch: Partial<OnboardingPreferences>) => {
    setPrefs((p) => {
      const next = { ...p, ...patch } as OnboardingPreferences;
      AsyncStorage.setItem('onboarding', JSON.stringify(next)).catch((e) =>
        console.error('Failed to persist onboarding', e)
      );
      return next;
    });
  }, []);

  const complete = useCallback(async () => {
    setPrefs((p) => {
      const next = { ...p, completed: true };
      AsyncStorage.setItem('onboarding', JSON.stringify(next)).catch((e) =>
        console.error('Failed to persist onboarding completion', e)
      );
      return next;
    });
  }, []);

  const reset = useCallback(async () => {
    setPrefs(DEFAULT_PREFS);
    await AsyncStorage.setItem('onboarding', JSON.stringify(DEFAULT_PREFS));
  }, []);

  return useMemo(
    () => ({ prefs, isLoading, update, complete, reset }),
    [prefs, isLoading, update, complete, reset]
  );
});
