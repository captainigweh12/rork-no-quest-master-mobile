import { supabase } from '@/lib/supabase';

export type EdgeResult<T> = { data: T | null; error: Error | null };

export async function getMapboxToken(): Promise<string | null> {
  console.log('[edge] get-mapbox-token');
  const { data, error } = await supabase.functions.invoke('get-mapbox-token');
  if (error) {
    console.error('[edge] get-mapbox-token error', error);
    return null;
  }
  const token = (data as { token?: string } | null)?.token ?? null;
  return token;
}

export async function getGoogleMapsKey(): Promise<string | null> {
  console.log('[edge] get-google-maps-key');
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) {
    console.error('[edge] get-google-maps-key error', error);
    return null;
  }
  const key = (data as { key?: string } | null)?.key ?? null;
  return key;
}

export interface SearchPlacesInput {
  query: string;
  latitude?: number;
  longitude?: number;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export async function searchPlaces(input: SearchPlacesInput): Promise<PlaceSuggestion[]> {
  console.log('[edge] search-places', input.query);
  const { data, error } = await supabase.functions.invoke('search-places', { body: input });
  if (error) {
    console.error('[edge] search-places error', error);
    return [];
  }
  return (data as PlaceSuggestion[] | null) ?? [];
}
