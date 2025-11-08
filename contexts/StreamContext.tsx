import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { typedStorage, isStorageReady } from '@/lib/storage';
import type { StreamMessage } from '@/types';
import {
  createStream,
  endStream,
  getLiveStreams,
  getStream,
  joinStream,
  leaveStream,
  sendStreamMessage,
  subscribeToStreamMessages,
  subscribeToStreamViewers,
} from '@/services/supabase/streams';

export type StreamVisibility = 'public' | 'private' | 'group';

export const [StreamProvider, useStream] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [visibility, setVisibility] = useState<StreamVisibility>('public');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [shareLocation, setShareLocation] = useState<boolean>(false);
  const [locationConsentAccepted, setLocationConsentAccepted] = useState<boolean>(false);

  const liveStreamsQuery = useQuery({
    queryKey: ['live-streams'],
    queryFn: getLiveStreams,
    refetchInterval: 30000,
    enabled: !!user,
    retry: 1,
    staleTime: 30000,
  });

  const activeStreamQuery = useQuery({
    queryKey: ['stream', activeStreamId],
    queryFn: () => (activeStreamId ? getStream(activeStreamId) : null),
    enabled: !!activeStreamId && !!user,
    retry: 1,
  });

  const createStreamMutation = useMutation({
    mutationFn: createStream,
    onSuccess: (stream) => {
      console.log('[STREAM_CONTEXT] Stream created:', stream.id);
      setActiveStreamId(stream.id);
      setIsStreaming(true);
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
    onError: (error) => {
      console.error('[STREAM_CONTEXT] Failed to create stream:', error);
    },
  });

  const endStreamMutation = useMutation({
    mutationFn: endStream,
    onSuccess: () => {
      console.log('[STREAM_CONTEXT] Stream ended');
      setActiveStreamId(null);
      setIsStreaming(false);
      setMessages([]);
      setViewerCount(0);
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    },
    onError: (error) => {
      console.error('[STREAM_CONTEXT] Failed to end stream:', error);
    },
  });

  const joinStreamMutation = useMutation({
    mutationFn: joinStream,
    onSuccess: (_, streamId) => {
      console.log('[STREAM_CONTEXT] Joined stream:', streamId);
      setActiveStreamId(streamId);
    },
    onError: (error) => {
      console.error('[STREAM_CONTEXT] Failed to join stream:', error);
    },
  });

  const leaveStreamMutation = useMutation({
    mutationFn: leaveStream,
    onSuccess: () => {
      console.log('[STREAM_CONTEXT] Left stream');
      setActiveStreamId(null);
      setMessages([]);
      setViewerCount(0);
    },
    onError: (error) => {
      console.error('[STREAM_CONTEXT] Failed to leave stream:', error);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: ({ streamId, message }: { streamId: string; message: string }) =>
      sendStreamMessage(streamId, message),
    onError: (error) => {
      console.error('[STREAM_CONTEXT] Failed to send message:', error);
    },
  });

  useEffect(() => {
    if (!activeStreamId) return;

    console.log('[STREAM_CONTEXT] Setting up subscriptions for stream:', activeStreamId);

    const messageChannel = subscribeToStreamMessages(activeStreamId, (message) => {
      console.log('[STREAM_CONTEXT] New message:', message);
      setMessages((prev) => [...prev, message]);
    });

    const viewerChannel = subscribeToStreamViewers(activeStreamId, (count) => {
      console.log('[STREAM_CONTEXT] Viewer count updated:', count);
      setViewerCount(count);
    });

    return () => {
      console.log('[STREAM_CONTEXT] Cleaning up subscriptions');
      messageChannel.unsubscribe();
      viewerChannel.unsubscribe();
    };
  }, [activeStreamId]);

  useEffect(() => {
    if (!isStorageReady()) {
      console.log('[STREAM_CONTEXT] Waiting for storage to be ready...');
      return;
    }

    (async () => {
      try {
        console.log('[STREAM_CONTEXT] Loading persisted settings...');
        const consent = await typedStorage.getJSON<string>('locationConsentAcceptedV1', '');
        const savedVisibility = await typedStorage.getJSON<string>('streamVisibility', '');
        const savedGroupId = await typedStorage.getJSON<string>('streamGroupId', '');
        const savedShareLoc = await typedStorage.getJSON<string>('streamShareLocation', '');
        
        if (consent) setLocationConsentAccepted(consent === '1');
        if (savedVisibility === 'public' || savedVisibility === 'private' || savedVisibility === 'group') {
          setVisibility(savedVisibility as StreamVisibility);
        }
        if (savedGroupId) setSelectedGroupId(savedGroupId);
        if (savedShareLoc) setShareLocation(savedShareLoc === '1');
        console.log('[STREAM_CONTEXT] ✓ Settings loaded');
      } catch (e) {
        console.warn('[STREAM_CONTEXT] Failed to load persisted settings:', e);
      }
    })();
  }, []);

  const { mutateAsync: createStreamAsync } = createStreamMutation;

  const startStreaming = useCallback(
    async (data: {
      title: string;
      description?: string;
      questId?: string;
      questTitle?: string;
      category?: string;
      visibility?: StreamVisibility;
      groupId?: string | null;
      shareLocation?: boolean;
      thumbnailUrl?: string | null;
    }) => {
      if (!user) {
        const error = new Error('User not authenticated');
        console.error('[STREAM_CONTEXT] User not authenticated');
        throw error;
      }

      const nextVisibility = data.visibility ?? visibility;
      const nextGroupId = data.groupId ?? selectedGroupId ?? null;
      const nextShareLoc = data.shareLocation ?? shareLocation;
      setVisibility(nextVisibility);
      setSelectedGroupId(nextGroupId);
      setShareLocation(nextShareLoc);
      try {
        await typedStorage.setJSON('streamVisibility', nextVisibility);
        await typedStorage.setJSON('streamGroupId', nextGroupId ?? '');
        await typedStorage.setJSON('streamShareLocation', nextShareLoc ? '1' : '0');
      } catch (e) {
        console.warn('[STREAM_CONTEXT] Failed to save settings:', e);
      }

      console.log('[STREAM_CONTEXT] Starting stream:', { ...data, visibility: nextVisibility, groupId: nextGroupId, shareLocation: nextShareLoc });
      await createStreamAsync({
        title: data.title,
        description: data.description,
        questId: data.questId,
        questTitle: data.questTitle,
        category: data.category,
        thumbnailUrl: data.thumbnailUrl,
      } as any);
    },
    [user, createStreamAsync, visibility, selectedGroupId, shareLocation]
  );

  const { mutateAsync: endStreamAsync } = endStreamMutation;

  const stopStreaming = useCallback(async () => {
    if (!activeStreamId) {
      console.warn('[STREAM_CONTEXT] No active stream to stop');
      return;
    }

    console.log('[STREAM_CONTEXT] Stopping stream:', activeStreamId);
    await endStreamAsync(activeStreamId);
  }, [activeStreamId, endStreamAsync]);

  const { mutateAsync: joinStreamAsync } = joinStreamMutation;

  const joinStreamById = useCallback(
    async (streamId: string) => {
      if (!user) {
        const error = new Error('User not authenticated');
        console.error('[STREAM_CONTEXT] User not authenticated');
        throw error;
      }

      console.log('[STREAM_CONTEXT] Joining stream:', streamId);
      await joinStreamAsync(streamId);
    },
    [user, joinStreamAsync]
  );

  const { mutateAsync: leaveStreamAsync } = leaveStreamMutation;

  const leaveCurrentStream = useCallback(async () => {
    if (!activeStreamId) {
      console.warn('[STREAM_CONTEXT] No active stream to leave');
      return;
    }

    console.log('[STREAM_CONTEXT] Leaving stream:', activeStreamId);
    await leaveStreamAsync(activeStreamId);
  }, [activeStreamId, leaveStreamAsync]);

  const { mutateAsync: sendMessageAsync } = sendMessageMutation;

  const acceptLocationConsent = useCallback(async () => {
    setLocationConsentAccepted(true);
    try { 
      await typedStorage.setJSON('locationConsentAcceptedV1', '1'); 
    } catch (e) {
      console.warn('[STREAM_CONTEXT] Failed to save location consent:', e);
    }
  }, []);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!activeStreamId) {
        console.warn('[STREAM_CONTEXT] No active stream to send message to');
        throw new Error('No active stream');
      }

      console.log('[STREAM_CONTEXT] Sending message to stream:', activeStreamId);
      await sendMessageAsync({ streamId: activeStreamId, message });
    },
    [activeStreamId, sendMessageAsync]
  );

  return useMemo(
    () => ({
      liveStreams: liveStreamsQuery.data ?? [],
      isLoadingStreams: liveStreamsQuery.isLoading,
      activeStream: activeStreamQuery.data,
      activeStreamId,
      isStreaming,
      messages,
      viewerCount,
      startStreaming,
      stopStreaming,
      joinStreamById,
      leaveCurrentStream,
      sendMessage,
      isStarting: createStreamMutation.isPending,
      isStopping: endStreamMutation.isPending,
      isJoining: joinStreamMutation.isPending,
      isLeaving: leaveStreamMutation.isPending,
      visibility,
      setVisibility,
      selectedGroupId,
      setSelectedGroupId,
      shareLocation,
      setShareLocation,
      locationConsentAccepted,
      acceptLocationConsent,
    }),
    [
      liveStreamsQuery.data,
      liveStreamsQuery.isLoading,
      activeStreamQuery.data,
      activeStreamId,
      isStreaming,
      messages,
      viewerCount,
      startStreaming,
      stopStreaming,
      joinStreamById,
      leaveCurrentStream,
      sendMessage,
      createStreamMutation.isPending,
      endStreamMutation.isPending,
      joinStreamMutation.isPending,
      leaveStreamMutation.isPending,
      visibility,
      selectedGroupId,
      shareLocation,
      locationConsentAccepted,
      acceptLocationConsent,
    ]
  );
});
