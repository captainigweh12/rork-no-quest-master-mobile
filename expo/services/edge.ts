export type EdgeResult<T> = { data: T | null; error: Error | null };

export async function getMapboxToken(): Promise<string | null> {
  console.log('[edge] get-mapbox-token - Supabase is disabled, returning null');
  return null;
}

export async function getGoogleMapsKey(): Promise<string | null> {
  console.log('[edge] get-google-maps-key - Supabase is disabled, returning null');
  return null;
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
  console.log('[edge] search-places - Supabase is disabled, returning empty array');
  return [];
}
