import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

export const [StreamProvider, useStream] = createContextHook(() => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);

  const liveStreamsQuery = useQuery({
    queryKey: ['live-streams'],
    queryFn: getLiveStreams,
    refetchInterval: 30000,
  });

  const activeStreamQuery = useQuery({
    queryKey: ['stream', activeStreamId],
    queryFn: () => (activeStreamId ? getStream(activeStreamId) : null),
    enabled: !!activeStreamId,
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

  const { mutateAsync: createStreamAsync } = createStreamMutation;

  const startStreaming = useCallback(
    async (data: {
      title: string;
      description?: string;
      questId?: string;
      questTitle?: string;
      category?: string;
    }) => {
      if (!user) {
        const error = new Error('User not authenticated');
        console.error('[STREAM_CONTEXT] User not authenticated');
        throw error;
      }

      console.log('[STREAM_CONTEXT] Starting stream:', data);
      await createStreamAsync(data);
    },
    [user, createStreamAsync]
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
    ]
  );
});
