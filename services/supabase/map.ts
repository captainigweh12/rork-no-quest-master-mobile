import { supabase } from '@/lib/supabase';
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
  
  const { data, error } = await supabase
    .from('place_queue')
    .insert({
      user_id: userId,
      quest_id: questId,
      place_name: placeName,
      place_address: placeAddress,
      latitude,
      longitude,
      notes,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding place to queue:', error);
    throw error;
  }

  return {
    id: data.id,
    userId: data.user_id,
    questId: data.quest_id,
    placeName: data.place_name,
    placeAddress: data.place_address,
    latitude: data.latitude,
    longitude: data.longitude,
    completed: data.completed,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  };
}

export async function getPlaceQueue(userId: string): Promise<PlaceQueueItem[]> {
  console.log('Getting place queue for user:', userId);
  
  const { data, error } = await supabase
    .from('place_queue')
    .select(`
      *,
      quest:quests(*)
    `)
    .eq('user_id', userId)
    .eq('completed', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error getting place queue:', error);
    throw error;
  }

  return (data || []).map((item: any) => ({
    id: item.id,
    userId: item.user_id,
    questId: item.quest_id,
    placeName: item.place_name,
    placeAddress: item.place_address,
    latitude: item.latitude,
    longitude: item.longitude,
    completed: item.completed,
    notes: item.notes,
    createdAt: new Date(item.created_at),
    completedAt: item.completed_at ? new Date(item.completed_at) : undefined,
    quest: item.quest ? {
      id: item.quest.id,
      title: item.quest.title,
      description: item.quest.description,
      type: item.quest.type,
      difficulty: item.quest.difficulty,
      points: item.quest.points,
      xp: item.quest.xp,
      completed: item.quest.completed,
      icon: item.quest.icon,
      minNoRequired: item.quest.min_no_required,
    } : undefined,
  }));
}

export async function markPlaceAsCompleted(placeId: string): Promise<void> {
  console.log('Marking place as completed:', placeId);
  
  const { error } = await supabase
    .from('place_queue')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', placeId);

  if (error) {
    console.error('Error marking place as completed:', error);
    throw error;
  }
}

export async function removePlaceFromQueue(placeId: string): Promise<void> {
  console.log('Removing place from queue:', placeId);
  
  const { error } = await supabase.from('place_queue').delete().eq('id', placeId);

  if (error) {
    console.error('Error removing place from queue:', error);
    throw error;
  }
}
