import localStorageService from '@/lib/localStorage';
import type { PlaceQueueItem } from '@/types';

export async function addPlaceToQueue(
  userId: string,
  questId: string,
  placeName: string,
  placeAddress: string | undefined,
  latitude: number,
  longitude: number,
  notes?: string
): Promise<PlaceQueueItem> {
  console.log('Adding place to queue:', placeName);
  const key = `places_${userId}`;
  const existing = (await localStorageService.getJSON<PlaceQueueItem[]>(key, [])) || [];
  const item: PlaceQueueItem = {
    id: Date.now().toString(),
    userId,
    questId,
    placeName,
    placeAddress,
    latitude,
    longitude,
    notes,
    completed: false,
    createdAt: new Date().toISOString(),
  } as any;
  existing.push(item);
  await localStorageService.setJSON(key, existing);
  return item;
}

export async function getPlaceQueue(userId: string): Promise<PlaceQueueItem[]> {
  console.log('Getting place queue for user:', userId);
  return (await localStorageService.getJSON<PlaceQueueItem[]>(`places_${userId}`, [])) || [];
}

export async function markPlaceAsCompleted(placeId: string, userId: string): Promise<void> {
  console.log('Marking place as completed:', placeId);
  const key = `places_${userId}`;
  const items = (await localStorageService.getJSON<PlaceQueueItem[]>(key, [])) || [];
  items.forEach(i => { if (i.id === placeId) i.completed = true; });
  await localStorageService.setJSON(key, items);
}

export async function removePlaceFromQueue(placeId: string, userId: string): Promise<void> {
  console.log('Removing place from queue:', placeId);
  const key = `places_${userId}`;
  let items = (await localStorageService.getJSON<PlaceQueueItem[]>(key, [])) || [];
  items = items.filter(i => i.id !== placeId);
  await localStorageService.setJSON(key, items);
}
