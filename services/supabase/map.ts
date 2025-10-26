import { localStorageService } from '@/lib/localStorage';
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
  return await localStorageService.addPlaceToQueue(userId, questId, placeName, placeAddress, latitude, longitude, notes);
}

export async function getPlaceQueue(userId: string): Promise<PlaceQueueItem[]> {
  console.log('Getting place queue for user:', userId);
  return await localStorageService.getPlaceQueue(userId);
}

export async function markPlaceAsCompleted(placeId: string, userId: string): Promise<void> {
  console.log('Marking place as completed:', placeId);
  await localStorageService.markPlaceAsCompleted(placeId, userId);
}

export async function removePlaceFromQueue(placeId: string, userId: string): Promise<void> {
  console.log('Removing place from queue:', placeId);
  await localStorageService.removePlaceFromQueue(placeId, userId);
}
