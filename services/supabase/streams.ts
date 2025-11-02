import { supabase } from '@/lib/supabase';
import type { LiveStream, StreamMessage } from '@/types';

export async function createStream(data: {
  title: string;
  description?: string;
  questId?: string;
  questTitle?: string;
  category?: string;
}): Promise<LiveStream> {
  console.log('[STREAMS] Creating new stream:', data);
  
  const { data: stream, error } = await supabase
    .from('live_streams')
    .insert({
      title: data.title,
      description: data.description,
      quest_id: data.questId,
      quest_title: data.questTitle,
      category: data.category,
      is_live: true,
    })
    .select(`
      id,
      streamer_id,
      title,
      description,
      quest_id,
      quest_title,
      thumbnail_url,
      viewer_count,
      is_live,
      started_at,
      ended_at,
      category
    `)
    .single();

  if (error) {
    console.error('[STREAMS] Error creating stream:', error);
    throw new Error(`Failed to create stream: ${error.message}`);
  }

  console.log('[STREAMS] Stream created successfully:', stream.id);

  return {
    id: stream.id,
    streamerId: stream.streamer_id,
    streamerName: '',
    title: stream.title,
    description: stream.description,
    questId: stream.quest_id,
    questTitle: stream.quest_title,
    thumbnailUrl: stream.thumbnail_url,
    viewerCount: stream.viewer_count,
    isLive: stream.is_live,
    startedAt: new Date(stream.started_at),
    endedAt: stream.ended_at ? new Date(stream.ended_at) : undefined,
    category: stream.category,
  };
}

export async function endStream(streamId: string): Promise<void> {
  console.log('[STREAMS] Ending stream:', streamId);
  
  const { error } = await supabase
    .from('live_streams')
    .update({
      is_live: false,
      ended_at: new Date().toISOString(),
    })
    .eq('id', streamId);

  if (error) {
    console.error('[STREAMS] Error ending stream:', error);
    throw new Error(`Failed to end stream: ${error.message}`);
  }

  console.log('[STREAMS] Stream ended successfully');
}

export async function getLiveStreams(): Promise<LiveStream[]> {
  console.log('[STREAMS] Fetching live streams');
  
  const { data: streams, error } = await supabase
    .from('live_streams')
    .select(`
      id,
      streamer_id,
      title,
      description,
      quest_id,
      quest_title,
      thumbnail_url,
      viewer_count,
      is_live,
      started_at,
      ended_at,
      category,
      user_profiles!live_streams_streamer_id_fkey (
        username,
        avatar_url
      )
    `)
    .eq('is_live', true)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('[STREAMS] Error fetching streams:', error);
    throw new Error(`Failed to fetch streams: ${error.message}`);
  }

  console.log(`[STREAMS] Found ${streams?.length ?? 0} live streams`);

  return (streams ?? []).map((stream: any) => ({
    id: stream.id,
    streamerId: stream.streamer_id,
    streamerName: stream.user_profiles?.username ?? 'Unknown',
    streamerAvatar: stream.user_profiles?.avatar_url,
    title: stream.title,
    description: stream.description,
    questId: stream.quest_id,
    questTitle: stream.quest_title,
    thumbnailUrl: stream.thumbnail_url,
    viewerCount: stream.viewer_count,
    isLive: stream.is_live,
    startedAt: new Date(stream.started_at),
    endedAt: stream.ended_at ? new Date(stream.ended_at) : undefined,
    category: stream.category,
  }));
}

export async function getStream(streamId: string): Promise<LiveStream | null> {
  console.log('[STREAMS] Fetching stream:', streamId);
  
  const { data: stream, error } = await supabase
    .from('live_streams')
    .select(`
      id,
      streamer_id,
      title,
      description,
      quest_id,
      quest_title,
      thumbnail_url,
      viewer_count,
      is_live,
      started_at,
      ended_at,
      category,
      user_profiles!live_streams_streamer_id_fkey (
        username,
        avatar_url
      )
    `)
    .eq('id', streamId)
    .single();

  if (error) {
    console.error('[STREAMS] Error fetching stream:', error);
    return null;
  }

  return {
    id: stream.id,
    streamerId: stream.streamer_id,
    streamerName: (stream.user_profiles as any)?.username ?? 'Unknown',
    streamerAvatar: (stream.user_profiles as any)?.avatar_url,
    title: stream.title,
    description: stream.description,
    questId: stream.quest_id,
    questTitle: stream.quest_title,
    thumbnailUrl: stream.thumbnail_url,
    viewerCount: stream.viewer_count,
    isLive: stream.is_live,
    startedAt: new Date(stream.started_at),
    endedAt: stream.ended_at ? new Date(stream.ended_at) : undefined,
    category: stream.category,
  };
}

export async function joinStream(streamId: string): Promise<void> {
  console.log('[STREAMS] Joining stream:', streamId);
  
  const { error } = await supabase
    .from('stream_viewers')
    .upsert({
      stream_id: streamId,
      user_id: (await supabase.auth.getUser()).data.user?.id,
      left_at: null,
    }, {
      onConflict: 'stream_id,user_id'
    });

  if (error) {
    console.error('[STREAMS] Error joining stream:', error);
    throw new Error(`Failed to join stream: ${error.message}`);
  }

  console.log('[STREAMS] Joined stream successfully');
}

export async function leaveStream(streamId: string): Promise<void> {
  console.log('[STREAMS] Leaving stream:', streamId);
  
  const userId = (await supabase.auth.getUser()).data.user?.id;
  
  const { error } = await supabase
    .from('stream_viewers')
    .update({ left_at: new Date().toISOString() })
    .eq('stream_id', streamId)
    .eq('user_id', userId);

  if (error) {
    console.error('[STREAMS] Error leaving stream:', error);
    throw new Error(`Failed to leave stream: ${error.message}`);
  }

  console.log('[STREAMS] Left stream successfully');
}

export async function sendStreamMessage(streamId: string, message: string): Promise<void> {
  console.log('[STREAMS] Sending message to stream:', streamId);
  
  const { error } = await supabase
    .from('stream_messages')
    .insert({
      stream_id: streamId,
      message,
    });

  if (error) {
    console.error('[STREAMS] Error sending message:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }

  console.log('[STREAMS] Message sent successfully');
}

export function subscribeToStreamMessages(
  streamId: string,
  callback: (message: StreamMessage) => void
) {
  console.log('[STREAMS] Subscribing to stream messages:', streamId);
  
  return supabase
    .channel(`stream-messages:${streamId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'stream_messages',
        filter: `stream_id=eq.${streamId}`,
      },
      async (payload: any) => {
        console.log('[STREAMS] New message received:', payload);
        
        const { data: userData } = await supabase
          .from('user_profiles')
          .select('username, avatar_url')
          .eq('id', payload.new.user_id)
          .single();

        callback({
          id: payload.new.id,
          streamId: payload.new.stream_id,
          userId: payload.new.user_id,
          username: userData?.username ?? 'Unknown',
          avatarUrl: userData?.avatar_url,
          message: payload.new.message,
          createdAt: new Date(payload.new.created_at),
        });
      }
    )
    .subscribe();
}

export function subscribeToStreamViewers(
  streamId: string,
  callback: (count: number) => void
) {
  console.log('[STREAMS] Subscribing to stream viewer updates:', streamId);
  
  return supabase
    .channel(`stream-viewers:${streamId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'live_streams',
        filter: `id=eq.${streamId}`,
      },
      (payload: any) => {
        console.log('[STREAMS] Viewer count updated:', payload.new.viewer_count);
        callback(payload.new.viewer_count);
      }
    )
    .subscribe();
}
