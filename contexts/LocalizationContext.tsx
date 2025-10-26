import createContextHook from '@nkzw/create-context-hook';
import { useAuth } from './AuthContext';
import { translate, getTranslations, SupportedLanguage } from '@/lib/i18n';
import { useMemo } from 'react';

export const [LocalizationProvider, useLocalization] = createContextHook(() => {
  const { user } = useAuth();
  const language = (user?.preferredLanguage || 'en') as SupportedLanguage;

  const t = useMemo(() => {
    return (path: string, fallback?: string) => translate(language, path, fallback);
  }, [language]);

  const translations = useMemo(() => {
    return getTranslations(language);
  }, [language]);

  return {
    language,
    t,
    translations,
  };
});
