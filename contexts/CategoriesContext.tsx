import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface AppCategory {
  id: string;
  title: string;
  color: string;
  image: string;
}

const ALL_CATEGORIES: AppCategory[] = [
  { id: 'entrepreneurship', title: 'Entrepreneurship', color: '#3787ff', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop' },
  { id: 'dating', title: 'Dating', color: '#ff5d8f', image: 'https://images.unsplash.com/photo-1529336953121-ad5a56b0eece?q=80&w=1200&auto=format&fit=crop' },
  { id: 'sales', title: 'Sales', color: '#F77F00', image: 'https://images.unsplash.com/photo-1553484771-371a605b060b?q=80&w=1200&auto=format&fit=crop' },
  { id: 'confidence', title: 'Confidence', color: '#10B981', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop' },
  { id: 'business', title: 'Business', color: '#3787ff', image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop' },
  { id: 'door-knocking', title: 'Door Knocking', color: '#FF6B35', image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?q=80&w=1200&auto=format&fit=crop' },
  { id: 'cold-calling', title: 'Cold Calling', color: '#004E89', image: 'https://images.unsplash.com/photo-1553484771-371a605b060b?q=80&w=1200&auto=format&fit=crop' },
  { id: 'marketing', title: 'Marketing', color: '#F77F00', image: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?q=80&w=1200&auto=format&fit=crop' },
  { id: 'adventure', title: 'Adventure', color: '#ff8a30', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop' },
  { id: 'fitness', title: 'Fitness', color: '#27c37b', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop' },
  { id: 'creativity', title: 'Creativity', color: '#9b5cff', image: 'https://images.unsplash.com/photo-1496307042754-b4aa456c4a2d?q=80&w=1200&auto=format&fit=crop' },
  { id: 'wealth', title: 'Wealth', color: '#20b2aa', image: 'https://images.unsplash.com/photo-1554224155-3a589877462f?q=80&w=1200&auto=format&fit=crop' },
  { id: 'mindset', title: 'Mindset', color: '#ffb020', image: 'https://images.unsplash.com/photo-1533371452382-d45a9da51ad9?q=80&w=1200&auto=format&fit=crop' },
  { id: 'relationships', title: 'Relationships', color: '#ff6b6b', image: 'https://images.unsplash.com/photo-1517884467360-71c4b3d48ee0?q=80&w=1200&auto=format&fit=crop' },
  { id: 'community', title: 'Community', color: '#00bcd4', image: 'https://images.unsplash.com/photo-1532634896-26909d0d4b6a?q=80&w=1200&auto=format&fit=crop' },
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
        const raw = await AsyncStorage.getItem('categories:selected');
        if (raw) {
          const parsed = JSON.parse(raw) as string[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedIdsState(parsed);
          }
        }
      } catch (e) {
        console.log('Failed to load categories, using defaults');
      } finally {
        setIsLoading(false);
      }
    };
    setTimeout(load, 0);
  }, []);

  const persist = useCallback(async (ids: string[]) => {
    try {
      await AsyncStorage.setItem('categories:selected', JSON.stringify(ids));
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