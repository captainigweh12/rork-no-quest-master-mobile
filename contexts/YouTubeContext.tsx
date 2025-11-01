import createContextHook from '@nkzw/create-context-hook';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getYouTubeApiKey } from '@/lib/env';
import * as AuthSession from 'expo-auth-session';

export type YouTubeLinkState = {
  channelUrl?: string;
  liveControlUrl?: string;
  lastConnectedAt?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  channelId?: string;
};

export type LiveInfo = {
  isLive: boolean;
  liveTitle?: string;
  concurrentViewers?: number;
  videoId?: string;
};

export type UpcomingItem = {
  videoId: string;
  title: string;
  scheduledStartTime?: string;
};

const STORAGE_KEY = 'yt_link_state_v2';

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = AuthSession.makeRedirectUri({ scheme: 'noquest' });

function extractChannelHint(url?: string): { id?: string; handleOrName?: string } {
  if (!url) return {};
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('channel');
    if (idx >= 0 && parts[idx + 1]) return { id: parts[idx + 1] };
    if (parts[0]?.startsWith('@')) return { handleOrName: parts[0] };
    if (parts[0] === 'c' && parts[1]) return { handleOrName: parts[1] };
    return {};
  } catch {
    return {};
  }
}

async function resolveChannelId(channelUrl: string, apiKey?: string): Promise<string | undefined> {
  const hint = extractChannelHint(channelUrl);
  if (hint.id) return hint.id;
  if (!apiKey || !hint.handleOrName) return undefined;
  const q = hint.handleOrName.startsWith('@') ? hint.handleOrName : `@${hint.handleOrName}`;
  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(q)}&maxResults=1&key=${apiKey}`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const id = data?.items?.[0]?.id?.channelId as string | undefined;
    return id;
  } catch (e) {
    console.error('[YouTube] resolveChannelId error', e);
    return undefined;
  }
}

async function fetchLiveAndUpcoming(channelUrl?: string) {
  const apiKey = getYouTubeApiKey();
  if (!apiKey || !channelUrl) return { live: { isLive: false } as LiveInfo, upcoming: [] as UpcomingItem[] };
  const channelId = await resolveChannelId(channelUrl, apiKey);
  if (!channelId) return { live: { isLive: false } as LiveInfo, upcoming: [] as UpcomingItem[] };

  try {
    const liveSearch = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&maxResults=1&key=${apiKey}`;
    const upcomingSearch = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=upcoming&type=video&maxResults=5&key=${apiKey}`;

    const [liveRes, upcomingRes] = await Promise.all([fetch(liveSearch), fetch(upcomingSearch)]);
    const liveJson = await liveRes.json();
    const upcomingJson = await upcomingRes.json();

    let live: LiveInfo = { isLive: false };
    const liveVideoId = liveJson?.items?.[0]?.id?.videoId as string | undefined;
    const upcomingIds: string[] = (upcomingJson?.items ?? []).map((it: any) => it?.id?.videoId).filter(Boolean);

    const detailsIds = [liveVideoId, ...upcomingIds].filter(Boolean).join(',');
    let details: any = null;
    if (detailsIds.length > 0) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails&id=${detailsIds}&key=${apiKey}`;
      const detRes = await fetch(detailsUrl);
      details = await detRes.json();
    }

    if (liveVideoId && details?.items) {
      const d = details.items.find((x: any) => x.id === liveVideoId);
      if (d) {
        const viewersRaw = d?.liveStreamingDetails?.concurrentViewers;
        live = {
          isLive: true,
          liveTitle: d?.snippet?.title,
          concurrentViewers: typeof viewersRaw === 'string' ? Number(viewersRaw) : viewersRaw,
          videoId: liveVideoId,
        };
      }
    }

    const upcoming: UpcomingItem[] = [];
    if (upcomingIds.length > 0 && details?.items) {
      for (const vid of upcomingIds) {
        const d = details.items.find((x: any) => x.id === vid);
        if (d) {
          upcoming.push({
            videoId: vid,
            title: d?.snippet?.title ?? 'Upcoming stream',
            scheduledStartTime: d?.liveStreamingDetails?.scheduledStartTime,
          });
        }
      }
    }

    return { live, upcoming } as { live: LiveInfo; upcoming: UpcomingItem[] };
  } catch (e) {
    console.error('[YouTube] fetchLiveAndUpcoming error', e);
    return { live: { isLive: false } as LiveInfo, upcoming: [] as UpcomingItem[] };
  }
}

export const [YouTubeProvider, useYouTube] = createContextHook(() => {
  const [state, setState] = useState<YouTubeLinkState | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed: YouTubeLinkState | null = raw ? JSON.parse(raw) : null;
        if (mounted) setState(parsed);
      } catch (e) {
        console.error('[YouTube] Failed to load state', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: YouTubeLinkState | null) => {
    try {
      if (next) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('[YouTube] Persist error', e);
    }
  }, []);

  const connectManually = useCallback(async (channelUrl: string) => {
    if (!channelUrl || !/^https?:\/\//.test(channelUrl)) {
      Alert.alert('Invalid URL', 'Please enter a valid YouTube channel URL.');
      return { success: false } as const;
    }
    const liveControlUrl = Platform.select({
      web: 'https://studio.youtube.com',
      default: 'https://studio.youtube.com',
    }) as string;
    const next: YouTubeLinkState = {
      channelUrl,
      liveControlUrl,
      lastConnectedAt: new Date().toISOString(),
    };
    setState(next);
    await persist(next);
    return { success: true } as const;
  }, [persist]);

  const disconnect = useCallback(async () => {
    setState(null);
    await persist(null);
  }, [persist]);

  const openChannel = useCallback(async () => {
    const url = state?.channelUrl;
    if (!url) {
      Alert.alert('Not connected', 'Add your YouTube channel URL first.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('[YouTube] openChannel error', e);
      Alert.alert('Error', 'Could not open your channel.');
    }
  }, [state?.channelUrl]);

  const goLive = useCallback(async () => {
    const url = state?.liveControlUrl ?? 'https://studio.youtube.com';
    try {
      await Linking.openURL(url);
    } catch (e) {
      console.error('[YouTube] goLive error', e);
      Alert.alert('Error', 'Could not open YouTube Studio.');
    }
  }, [state?.liveControlUrl]);

  const connectViaOAuth = useCallback(async () => {
    try {
      const discovery = {
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
      };

      const authRequest = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: [
          'https://www.googleapis.com/auth/youtube',
          'https://www.googleapis.com/auth/youtube.force-ssl',
          'https://www.googleapis.com/auth/youtube.readonly',
        ],
        redirectUri: REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
      });

      const result = await authRequest.promptAsync(discovery);

      if (result.type === 'success' && result.params.code) {
        const tokenResponse = await fetch(discovery.tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: result.params.code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: REDIRECT_URI,
            grant_type: 'authorization_code',
          }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (tokens.access_token) {
          const channelResponse = await fetch(
            'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
            {
              headers: { Authorization: `Bearer ${tokens.access_token}` },
            }
          );

          const channelData = await channelResponse.json();
          const channelId = channelData?.items?.[0]?.id;
          const channelUrl = channelId
            ? `https://www.youtube.com/channel/${channelId}`
            : undefined;

          const expiresAt = new Date(
            Date.now() + (tokens.expires_in ?? 3600) * 1000
          ).toISOString();

          const next: YouTubeLinkState = {
            channelUrl,
            channelId,
            liveControlUrl: 'https://studio.youtube.com',
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt,
            lastConnectedAt: new Date().toISOString(),
          };

          setState(next);
          await persist(next);

          return { success: true };
        }
      }

      return { success: false };
    } catch (error) {
      console.error('[YouTube] OAuth error', error);
      Alert.alert('Connection Failed', 'Could not connect to Google. Please try again.');
      return { success: false };
    }
  }, [persist]);

  const createLiveStreamMutation = useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      scheduledStartTime?: string;
    }) => {
      if (!state?.accessToken) {
        throw new Error('Not authenticated');
      }

      const broadcast = await fetch(
        'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=snippet,status,contentDetails',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title: params.title,
              description: params.description,
              scheduledStartTime: params.scheduledStartTime || new Date().toISOString(),
            },
            status: {
              privacyStatus: 'public',
              selfDeclaredMadeForKids: false,
            },
            contentDetails: {
              enableAutoStart: true,
              enableAutoStop: true,
            },
          }),
        }
      );

      const broadcastData = await broadcast.json();

      if (!broadcastData.id) {
        throw new Error('Failed to create broadcast');
      }

      const stream = await fetch(
        'https://www.googleapis.com/youtube/v3/liveStreams?part=snippet,cdn,contentDetails,status',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snippet: {
              title: `${params.title} - Stream`,
            },
            cdn: {
              frameRate: 'variable',
              ingestionType: 'rtmp',
              resolution: 'variable',
            },
          }),
        }
      );

      const streamData = await stream.json();

      if (!streamData.id) {
        throw new Error('Failed to create stream');
      }

      await fetch(
        `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastData.id}&part=id,snippet,contentDetails,status&streamId=${streamData.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${state.accessToken}`,
          },
        }
      );

      return {
        broadcastId: broadcastData.id,
        streamId: streamData.id,
        streamUrl: streamData.cdn?.ingestionInfo?.streamName,
        streamKey: streamData.cdn?.ingestionInfo?.ingestionAddress,
        watchUrl: `https://www.youtube.com/watch?v=${broadcastData.id}`,
      };
    },
  });

  const { mutate: createLiveStream, isPending: isCreatingStream, data: streamData, error: streamError } = createLiveStreamMutation;

  const liveQuery = useQuery({
    queryKey: ['yt-live', state?.channelUrl, getYouTubeApiKey()],
    queryFn: async () => fetchLiveAndUpcoming(state?.channelUrl),
    enabled: !!state?.channelUrl && !!getYouTubeApiKey(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return useMemo(() => ({
    isLoading,
    isConnected: !!state?.channelUrl,
    isOAuthConnected: !!state?.accessToken,
    state,
    connectManually,
    connectViaOAuth,
    disconnect,
    openChannel,
    goLive,
    createLiveStream,
    isCreatingStream,
    streamData,
    streamError,
    live: (liveQuery.data?.live ?? { isLive: false }) as LiveInfo,
    upcoming: (liveQuery.data?.upcoming ?? []) as UpcomingItem[],
    isFetchingLive: liveQuery.isFetching,
    refetchLive: liveQuery.refetch,
  }), [isLoading, state, connectManually, connectViaOAuth, disconnect, openChannel, goLive, createLiveStream, isCreatingStream, streamData, streamError, liveQuery.data, liveQuery.isFetching, liveQuery.refetch]);
});
