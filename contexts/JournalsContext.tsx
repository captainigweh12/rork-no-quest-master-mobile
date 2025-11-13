import { storage } from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

export type Skill = 'charisma' | 'intellect' | 'courage' | 'empathy' | 'creativity' | 'discipline';

export type JournalPrivacy = 'private' | 'friends' | 'public';

export interface JournalEntry {
  id: string;
  title: string;
  notes?: string;
  images?: string[];
  skills: Skill[];
  privacy: JournalPrivacy;
  createdAt: string;
}

interface JournalsState {
  journals: JournalEntry[];
  addJournal: (input: { title: string; notes?: string; images?: string[]; skills: Skill[]; privacy: JournalPrivacy }) => Promise<JournalEntry>;
  removeJournal: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  isLoading: boolean;
  error?: string;
}

const STORAGE_KEY = 'journals:v2';

export const [JournalsProvider, useJournals] = createContextHook<JournalsState>(() => {
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const load = async () => {
      if (mountedRef.current) setIsLoading(true);
      try {
  const raw = await storage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as JournalEntry[];
            if (Array.isArray(parsed)) {
              if (mountedRef.current) setJournals(parsed);
            } else {
              console.warn('[JournalsContext] Parsed data is not an array, clearing');
              await storage.removeItem(STORAGE_KEY);
            }
          } catch (parseError) {
            console.error('[JournalsContext] Invalid JSON in storage, clearing corrupted data:', parseError);
            await storage.removeItem(STORAGE_KEY);
            if (mountedRef.current) setError('Corrupted data cleared');
          }
        }
      } catch (e) {
        if (mountedRef.current) setError('Failed to load journals');
        console.error('Journals load error', e);
      } finally {
        if (mountedRef.current) setIsLoading(false);
      }
    };
    load();
    return () => { mountedRef.current = false; };
  }, []);

  const persist = useCallback(async (data: JournalEntry[]) => {
    try {
  await storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Journals persist error', e);
    }
  }, []);

  const addJournal = useCallback(async (input: { title: string; notes?: string; images?: string[]; skills: Skill[]; privacy: JournalPrivacy }) => {
    const entry: JournalEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: input.title,
      notes: input.notes,
      images: input.images ?? [],
      skills: input.skills,
      privacy: input.privacy,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...journals];
    setJournals(updated);
    await persist(updated);
    return entry;
  }, [journals, persist]);

  const removeJournal = useCallback(async (id: string) => {
    const updated = journals.filter(j => j.id !== id);
    setJournals(updated);
    await persist(updated);
  }, [journals, persist]);

  const clearAll = useCallback(async () => {
    setJournals([]);
    try {
  await storage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Journals clear error', e);
    }
  }, []);

  return useMemo(() => ({ journals, addJournal, removeJournal, clearAll, isLoading, error }), [journals, addJournal, removeJournal, clearAll, isLoading, error]);
});
