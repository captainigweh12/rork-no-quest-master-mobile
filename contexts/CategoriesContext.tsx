import { storage } from '@/lib/storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface AppCategory {
  id: string;
  title: string;
  color: string;
  image: string;
}

const ALL_CATEGORIES: AppCategory[] = [
  { id: 'entrepreneurship', title: 'Entrepreneurship', color: '#F77F00', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/eo1c1pr40xgqgi4uopq74' },
  { id: 'dating', title: 'Dating', color: '#ff5d8f', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ki545qv6qykuz0fllbnj1' },
  { id: 'sales', title: 'Sales', color: '#ffb020', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/xsjx21rgklqu2b313ay5q' },
  { id: 'confidence', title: 'Confidence', color: '#ff6b6b', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/zhjopkk2s0ga7n1cu77le' },
  { id: 'business', title: 'Business', color: '#10B981', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/bdfxtmaxus9vybt2o2c8y' },
  { id: 'door-knocking', title: 'Door Knocking', color: '#FF6B35', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ieqp30t65yxavnxqto88u' },
  { id: 'cold-calling', title: 'Cold Calling', color: '#004E89', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/93rn2m6ibekcgwi2mxob8' },
  { id: 'marketing', title: 'Marketing', color: '#3787ff', image: 'https://r2-pub.rork.com/generated-images/0695e78f-ee41-45ee-883c-3e7f5f1d859b.png' },
  { id: 'adventure', title: 'Adventure', color: '#ff8a30', image: 'https://r2-pub.rork.com/generated-images/8a8159ca-e52e-44cd-a6fb-d662133abaa1.png' },
  { id: 'fitness', title: 'Fitness', color: '#27c37b', image: 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/n1mhyfzhpv7j3o65crpe6' },
  { id: 'creativity', title: 'Creativity', color: '#9b5cff', image: 'https://r2-pub.rork.com/generated-images/75c4c894-79c7-498a-b334-1771befa4dad.png' },
  { id: 'wealth', title: 'Wealth', color: '#20b2aa', image: 'https://r2-pub.rork.com/generated-images/5977b830-39ad-44cc-bd9f-46b6ad6ded31.png' },
  { id: 'mindset', title: 'Mindset', color: '#9b5cff', image: 'https://r2-pub.rork.com/generated-images/9781fb20-370c-4538-812f-0c6244f6f46d.png' },
  { id: 'relationships', title: 'Relationships', color: '#ff5d8f', image: 'https://r2-pub.rork.com/generated-images/1050440a-76e7-4242-80a9-2481479e80fa.png' },
  { id: 'community', title: 'Community', color: '#00bcd4', image: 'https://r2-pub.rork.com/generated-images/765821d4-51a1-4023-ad2a-d19fd3ddff00.png' },
];

const DEFAULT_SELECTED_IDS: string[] = ['entrepreneurship','dating','sales','confidence'];

export interface CategoriesState {
  all: AppCategory[];
  selectedIds: string[];
  selected: AppCategory[];
  toggle: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  isLoading: boolean;
}

export const [CategoriesProvider, useCategories] = createContextHook(() => {
  const [all] = useState<AppCategory[]>(ALL_CATEGORIES);
  const [selectedIds, setSelectedIdsState] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const load = async () => {
      try {
        const timeoutPromise = new Promise<null>((_, reject) => {
          setTimeout(() => reject(new Error('Categories load timeout')), 500);
        });

  const dataPromise = storage.getItem('categories:selected');

        const raw = await Promise.race([dataPromise, timeoutPromise]);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as string[];
            if (Array.isArray(parsed) && parsed.length > 0) {
              setSelectedIdsState(parsed);
            }
          } catch (parseError) {
            console.error('[CategoriesContext] Invalid JSON in storage, clearing corrupted data:', parseError);
            await storage.removeItem('categories:selected');
          }
        }
      } catch (e) {
        console.log('Failed to load categories, using defaults:', e instanceof Error ? e.message : 'unknown');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const persist = useCallback(async (ids: string[]) => {
    try {
  await storage.setItem('categories:selected', JSON.stringify(ids));
    } catch (e) {
      console.error('Failed to save categories', e);
    }
  }, []);

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState(ids);
    persist(ids);
  }, [persist]);

  const toggle = useCallback((id: string) => {
    setSelectedIdsState((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      persist(next);
      return next;
    });
  }, [persist]);

  const selected = useMemo(() => all.filter(c => selectedIds.includes(c.id)), [all, selectedIds]);

  return useMemo(() => ({ all, selectedIds, selected, toggle, setSelectedIds, isLoading }), [all, selectedIds, selected, toggle, setSelectedIds, isLoading]);
});