import { supabase } from '@/lib/supabase';
import type { LiveStream, StreamMessage } from '@/types';

const DEFAULT_STREAM_THUMBNAIL = 'https://images.unsplash.com/photo-1524250502761-1ac6f2e30d43?q=80&w=1200&auto=format&fit=crop';

export async function createStream(data: {
  title: string;
  description?: string;
  questId?: string;
  questTitle?: string;
  category?: string;
  visibility?: 'public' | 'private' | 'group';
  groupId?: string | null;
  shareLocation?: boolean;
  thumbnailUrl?: string | null;
}): Promise<LiveStream> {
  console.log('[STREAMS] Creating new stream:', data);
  
  const thumbnailUrl = data.thumbnailUrl && data.thumbnailUrl.trim() !== '' 
    ? data.thumbnailUrl 
    : DEFAULT_STREAM_THUMBNAIL;
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('[STREAMS] User not authenticated');
    throw new Error('User must be authenticated to create a stream');
  }
  
  const { data: stream, error } = await supabase
    .from('live_streams')
    .insert({
      streamer_id: user.id,
      title: data.title,
      description: data.description,
      quest_id: data.questId,
      quest_title: data.questTitle,
      category: data.category,
      thumbnail_url: thumbnailUrl,
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

  const attemptJoin = await supabase
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

  if (!attemptJoin.error) {
    const streams = attemptJoin.data ?? [];
    console.log(`[STREAMS] Found ${streams.length} live streams (joined)`);
    return streams.map((stream: any) => ({
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

  const err = attemptJoin.error as any;
  const errCode: string | undefined = err?.code;
  const errMsg: string = JSON.stringify(err ?? {}, null, 2);
  console.warn('[STREAMS] Join failed, falling back without relationship:', errMsg);

  if (errCode && errCode !== 'PGRST200') {
    throw new Error(`Failed to fetch streams: ${err?.message ?? 'Unknown error'}`);
  }

  const { data: bareStreams, error: bareError } = await supabase
    .from('live_streams')
    .select(
      `id, streamer_id, title, description, quest_id, quest_title, thumbnail_url, viewer_count, is_live, started_at, ended_at, category`
    )
    .eq('is_live', true)
    .order('started_at', { ascending: false });

  if (bareError) {
    console.error('[STREAMS] Error fetching streams (bare):', JSON.stringify(bareError, null, 2));
    throw new Error(`Failed to fetch streams: ${bareError.message}`);
  }

  const streamerIds = (bareStreams ?? []).map((s: any) => s.streamer_id).filter(Boolean);
  const uniqueStreamerIds = Array.from(new Set<string>(streamerIds));

  let profilesById: Record<string, { username?: string; avatar_url?: string }> = {};
  if (uniqueStreamerIds.length > 0) {
    const { data: profiles, error: profErr } = await supabase
      .from('user_profiles')
      .select('id, username, avatar_url')
      .in('id', uniqueStreamerIds);
    if (profErr) {
      console.warn('[STREAMS] Failed to fetch profiles for streams:', JSON.stringify(profErr, null, 2));
    } else {
      profilesById = (profiles ?? []).reduce(
        (acc: Record<string, { username?: string; avatar_url?: string }>, p: any) => {
          acc[p.id] = { username: p.username, avatar_url: p.avatar_url };
          return acc;
        },
        {}
      );
    }
  }

  console.log(`[STREAMS] Found ${bareStreams?.length ?? 0} live streams (fallback)`);
  return (bareStreams ?? []).map((stream: any) => {
    const prof = profilesById[stream.streamer_id] ?? {};
    return {
      id: stream.id,
      streamerId: stream.streamer_id,
      streamerName: prof.username ?? 'Unknown',
      streamerAvatar: prof.avatar_url,
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
    } as LiveStream;
  });
}

export async function getStream(streamId: string): Promise<LiveStream | null> {
  console.log('[STREAMS] Fetching stream:', streamId);

  const attemptJoin = await supabase
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

  if (!attemptJoin.error && attemptJoin.data) {
    const stream = attemptJoin.data as any;
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
    } as LiveStream;
  }

  const err = attemptJoin.error as any;
  if (err && err.code && err.code !== 'PGRST200') {
    console.error('[STREAMS] Error fetching stream:', JSON.stringify(err, null, 2));
    return null;
  }

  const { data: bare, error: bareErr } = await supabase
    .from('live_streams')
    .select(
      `id, streamer_id, title, description, quest_id, quest_title, thumbnail_url, viewer_count, is_live, started_at, ended_at, category`
    )
    .eq('id', streamId)
    .single();

  if (bareErr || !bare) {
    console.error('[STREAMS] Error fetching stream (bare):', JSON.stringify(bareErr, null, 2));
    return null;
  }

  let username: string | undefined;
  let avatar_url: string | undefined;
  const { data: prof, error: profErr } = await supabase
    .from('user_profiles')
    .select('username, avatar_url')
    .eq('id', (bare as any).streamer_id)
    .single();
  if (profErr) {
    console.warn('[STREAMS] Failed to fetch streamer profile:', JSON.stringify(profErr, null, 2));
  } else {
    username = prof?.username ?? undefined;
    avatar_url = prof?.avatar_url ?? undefined;
  }

  return {
    id: (bare as any).id,
    streamerId: (bare as any).streamer_id,
    streamerName: username ?? 'Unknown',
    streamerAvatar: avatar_url,
    title: (bare as any).title,
    description: (bare as any).description,
    questId: (bare as any).quest_id,
    questTitle: (bare as any).quest_title,
    thumbnailUrl: (bare as any).thumbnail_url,
    viewerCount: (bare as any).viewer_count,
    isLive: (bare as any).is_live,
    startedAt: new Date((bare as any).started_at),
    endedAt: (bare as any).ended_at ? new Date((bare as any).ended_at) : undefined,
    category: (bare as any).category,
  } as LiveStream;
}

export async function joinStream(streamId: string): Promise<void> {
  console.log('[STREAMS] Joining stream:', streamId);
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('[STREAMS] User not authenticated');
    throw new Error('User must be authenticated to join a stream');
  }
  
  const { error } = await supabase
    .from('stream_viewers')
    .upsert({
      stream_id: streamId,
      user_id: user.id,
      left_at: null,
    }, {
      onConflict: 'stream_id,user_id'
    });

  if (error) {
    console.error('[STREAMS] Error joining stream:', JSON.stringify(error, null, 2));
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
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error('[STREAMS] User not authenticated');
    throw new Error('User must be authenticated to send messages');
  }
  
  const { error } = await supabase
    .from('stream_messages')
    .insert({
      stream_id: streamId,
      user_id: user.id,
      message,
    });

  if (error) {
    console.error('[STREAMS] Error sending message:', JSON.stringify(error, null, 2));
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
