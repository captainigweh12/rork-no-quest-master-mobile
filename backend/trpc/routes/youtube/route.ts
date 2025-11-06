import { z } from "zod";
import { publicProcedure, createTRPCRouter } from "../../create-context";
import { createClient } from "@supabase/supabase-js";

// Environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// YouTube API endpoints
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

// Lazy initialization of Supabase client - only create if credentials exist
let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }
  return supabaseClient;
}

/**
 * Helper function to refresh YouTube access token
 */
async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh token');
    }

    const data = await response.json();
    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
    };
  } catch (error) {
    console.error('[YouTube] Token refresh error:', error);
    throw error;
  }
}

/**
 * Helper function to get valid access token (refresh if needed)
 */
async function getValidAccessToken(userId: string): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: tokenData, error } = await supabase
      .from('youtube_oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      console.log('[YouTube] No token found for user:', userId);
      return null;
    }

    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();

    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('[YouTube] Token expiring soon, refreshing...');
      
      if (!tokenData.refresh_token) {
        console.error('[YouTube] No refresh token available');
        return null;
      }

      const refreshed = await refreshAccessToken(tokenData.refresh_token);
      const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      // Update token in database
      const supabase = getSupabaseClient();
      await supabase
        .from('youtube_oauth_tokens')
        .update({
          access_token: refreshed.access_token,
          expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return refreshed.access_token;
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('[YouTube] Error getting valid token:', error);
    return null;
  }
}

const youtubeRouter = createTRPCRouter({
  /**
   * Exchange OAuth code for tokens and store in database
   */
  connectOAuth: publicProcedure
    .input(z.object({
      code: z.string(),
      redirectUri: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Exchanging OAuth code for tokens');

      try {
        // Exchange code for tokens
        const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code: input.code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: input.redirectUri,
            grant_type: 'authorization_code',
          }).toString(),
        });

        if (!tokenResponse.ok) {
          const error = await tokenResponse.json();
          console.error('[YouTube] Token exchange error:', error);
          throw new Error('Failed to exchange code for tokens');
        }

        const tokens = await tokenResponse.json();

        // Get channel information
        const channelResponse = await fetch(
          `${YOUTUBE_API_BASE}/channels?part=snippet&mine=true`,
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          }
        );

        if (!channelResponse.ok) {
          throw new Error('Failed to fetch channel information');
        }

        const channelData = await channelResponse.json();
        const channel = channelData.items?.[0];

        if (!channel) {
          throw new Error('No YouTube channel found for this account');
        }

        const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000);

        // Store tokens in database (upsert)
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('youtube_oauth_tokens')
          .upsert({
            user_id: input.userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_type: tokens.token_type || 'Bearer',
            expires_at: expiresAt.toISOString(),
            scope: tokens.scope,
            channel_id: channel.id,
            channel_title: channel.snippet?.title,
            channel_url: `https://www.youtube.com/channel/${channel.id}`,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (error) {
          console.error('[YouTube] Database error:', error);
          throw new Error('Failed to store tokens');
        }

        console.log('[YouTube] OAuth connection successful');

        return {
          success: true,
          channelId: channel.id,
          channelTitle: channel.snippet?.title,
          channelUrl: `https://www.youtube.com/channel/${channel.id}`,
        };
      } catch (error: any) {
        console.error('[YouTube] OAuth connection failed:', error);
        throw new Error(error.message || 'Failed to connect YouTube account');
      }
    }),

  /**
   * Get connection status for a user
   */
  getConnectionStatus: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('youtube_oauth_tokens')
          .select('channel_id, channel_title, channel_url, expires_at')
          .eq('user_id', input.userId)
          .single();

        if (error || !data) {
          return {
            connected: false,
            channelId: null,
            channelTitle: null,
            channelUrl: null,
          };
        }

        const isExpired = new Date(data.expires_at) < new Date();

        return {
          connected: !isExpired,
          channelId: data.channel_id,
          channelTitle: data.channel_title,
          channelUrl: data.channel_url,
          expiresAt: data.expires_at,
        };
      } catch (error) {
        console.error('[YouTube] Error checking connection status:', error);
        return {
          connected: false,
          channelId: null,
          channelTitle: null,
          channelUrl: null,
        };
      }
    }),

  /**
   * Disconnect YouTube account (remove tokens)
   */
  disconnect: publicProcedure
    .input(z.object({
      userId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Disconnecting account for user:', input.userId);

      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from('youtube_oauth_tokens')
          .delete()
          .eq('user_id', input.userId);

        if (error) {
          throw new Error('Failed to disconnect account');
        }

        return { success: true };
      } catch (error: any) {
        console.error('[YouTube] Disconnect error:', error);
        throw new Error(error.message || 'Failed to disconnect YouTube account');
      }
    }),

  /**
   * Create a YouTube live broadcast
   */
  createBroadcast: publicProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
      description: z.string().optional(),
      privacyStatus: z.enum(['public', 'unlisted', 'private']).default('public'),
      scheduledStartTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Creating broadcast:', input.title);

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts?part=snippet,status,contentDetails`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                title: input.title,
                description: input.description || '',
                scheduledStartTime: input.scheduledStartTime || new Date().toISOString(),
              },
              status: {
                privacyStatus: input.privacyStatus,
                selfDeclaredMadeForKids: false,
              },
              contentDetails: {
                enableAutoStart: true,
                enableAutoStop: true,
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('[YouTube] Create broadcast error:', error);
          throw new Error(error.error?.message || 'Failed to create broadcast');
        }

        const broadcast = await response.json();
        console.log('[YouTube] Broadcast created:', broadcast.id);

        return {
          broadcastId: broadcast.id,
          title: broadcast.snippet?.title,
          scheduledStartTime: broadcast.snippet?.scheduledStartTime,
          privacyStatus: broadcast.status?.privacyStatus,
        };
      } catch (error: any) {
        console.error('[YouTube] Create broadcast failed:', error);
        throw new Error(error.message || 'Failed to create YouTube broadcast');
      }
    }),

  /**
   * Create a YouTube live stream
   */
  createStream: publicProcedure
    .input(z.object({
      userId: z.string(),
      title: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Creating stream:', input.title);

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveStreams?part=snippet,cdn,contentDetails,status`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                title: input.title,
              },
              cdn: {
                frameRate: 'variable',
                ingestionType: 'rtmp',
                resolution: 'variable',
              },
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('[YouTube] Create stream error:', error);
          throw new Error(error.error?.message || 'Failed to create stream');
        }

        const stream = await response.json();
        console.log('[YouTube] Stream created:', stream.id);

        return {
          streamId: stream.id,
          streamName: stream.cdn?.ingestionInfo?.streamName,
          ingestionAddress: stream.cdn?.ingestionInfo?.ingestionAddress,
          rtmpUrl: `${stream.cdn?.ingestionInfo?.ingestionAddress}/${stream.cdn?.ingestionInfo?.streamName}`,
        };
      } catch (error: any) {
        console.error('[YouTube] Create stream failed:', error);
        throw new Error(error.message || 'Failed to create YouTube stream');
      }
    }),

  /**
   * Bind broadcast to stream
   */
  bindBroadcastToStream: publicProcedure
    .input(z.object({
      userId: z.string(),
      broadcastId: z.string(),
      streamId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Binding broadcast to stream');

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts/bind?id=${input.broadcastId}&part=id,snippet,contentDetails,status&streamId=${input.streamId}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('[YouTube] Bind error:', error);
          throw new Error(error.error?.message || 'Failed to bind broadcast to stream');
        }

        const result = await response.json();
        console.log('[YouTube] Broadcast bound to stream successfully');

        return {
          success: true,
          watchUrl: `https://www.youtube.com/watch?v=${input.broadcastId}`,
        };
      } catch (error: any) {
        console.error('[YouTube] Bind failed:', error);
        throw new Error(error.message || 'Failed to bind broadcast to stream');
      }
    }),

  /**
   * Create complete live stream setup (broadcast + stream + bind)
   */
  createLiveStream: publicProcedure
    .input(z.object({
      userId: z.string(),
      questId: z.string().optional(),
      title: z.string(),
      description: z.string().optional(),
      privacyStatus: z.enum(['public', 'unlisted', 'private']).default('public'),
      scheduledStartTime: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Creating complete live stream setup');

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        // Step 1: Create broadcast
        const broadcastResponse = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts?part=snippet,status,contentDetails`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                title: input.title,
                description: input.description || '',
                scheduledStartTime: input.scheduledStartTime || new Date().toISOString(),
              },
              status: {
                privacyStatus: input.privacyStatus,
                selfDeclaredMadeForKids: false,
              },
              contentDetails: {
                enableAutoStart: true,
                enableAutoStop: true,
              },
            }),
          }
        );

        if (!broadcastResponse.ok) {
          const error = await broadcastResponse.json();
          throw new Error(error.error?.message || 'Failed to create broadcast');
        }

        const broadcast = await broadcastResponse.json();

        // Step 2: Create stream
        const streamResponse = await fetch(
          `${YOUTUBE_API_BASE}/liveStreams?part=snippet,cdn,contentDetails,status`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              snippet: {
                title: `${input.title} - Stream`,
              },
              cdn: {
                frameRate: 'variable',
                ingestionType: 'rtmp',
                resolution: 'variable',
              },
            }),
          }
        );

        if (!streamResponse.ok) {
          const error = await streamResponse.json();
          throw new Error(error.error?.message || 'Failed to create stream');
        }

        const stream = await streamResponse.json();

        // Step 3: Bind broadcast to stream
        const bindResponse = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts/bind?id=${broadcast.id}&part=id,snippet,contentDetails,status&streamId=${stream.id}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!bindResponse.ok) {
          const error = await bindResponse.json();
          throw new Error(error.error?.message || 'Failed to bind broadcast to stream');
        }

        // Step 4: Store in database
        const supabase = getSupabaseClient();
        const { error: dbError } = await supabase
          .from('live_streams')
          .insert({
            streamer_id: input.userId,
            quest_id: input.questId,
            title: input.title,
            description: input.description,
            stream_platform: 'youtube',
            privacy_status: input.privacyStatus,
            youtube_broadcast_id: broadcast.id,
            youtube_stream_id: stream.id,
            youtube_stream_key: stream.cdn?.ingestionInfo?.streamName,
            youtube_rtmp_url: stream.cdn?.ingestionInfo?.ingestionAddress,
            youtube_watch_url: `https://www.youtube.com/watch?v=${broadcast.id}`,
            scheduled_start_time: input.scheduledStartTime,
            is_live: false,
          });

        if (dbError) {
          console.error('[YouTube] Database error:', dbError);
        }

        console.log('[YouTube] Complete live stream setup created');

        return {
          broadcastId: broadcast.id,
          streamId: stream.id,
          streamKey: stream.cdn?.ingestionInfo?.streamName,
          rtmpUrl: `${stream.cdn?.ingestionInfo?.ingestionAddress}/${stream.cdn?.ingestionInfo?.streamName}`,
          watchUrl: `https://www.youtube.com/watch?v=${broadcast.id}`,
          title: input.title,
          privacyStatus: input.privacyStatus,
        };
      } catch (error: any) {
        console.error('[YouTube] Create live stream failed:', error);
        throw new Error(error.message || 'Failed to create YouTube live stream');
      }
    }),

  /**
   * Transition broadcast to live
   */
  startBroadcast: publicProcedure
    .input(z.object({
      userId: z.string(),
      broadcastId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Starting broadcast:', input.broadcastId);

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts/transition?broadcastStatus=live&id=${input.broadcastId}&part=status`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('[YouTube] Start broadcast error:', error);
          throw new Error(error.error?.message || 'Failed to start broadcast');
        }

        // Update database
        const supabase = getSupabaseClient();
        await supabase
          .from('live_streams')
          .update({ is_live: true, started_at: new Date().toISOString() })
          .eq('youtube_broadcast_id', input.broadcastId);

        console.log('[YouTube] Broadcast started successfully');

        return { success: true };
      } catch (error: any) {
        console.error('[YouTube] Start broadcast failed:', error);
        throw new Error(error.message || 'Failed to start YouTube broadcast');
      }
    }),

  /**
   * End broadcast
   */
  endBroadcast: publicProcedure
    .input(z.object({
      userId: z.string(),
      broadcastId: z.string(),
    }))
    .mutation(async ({ input }) => {
      console.log('[YouTube] Ending broadcast:', input.broadcastId);

      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts/transition?broadcastStatus=complete&id=${input.broadcastId}&part=status`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          console.error('[YouTube] End broadcast error:', error);
          throw new Error(error.error?.message || 'Failed to end broadcast');
        }

        // Update database
        const supabase = getSupabaseClient();
        await supabase
          .from('live_streams')
          .update({ is_live: false, ended_at: new Date().toISOString() })
          .eq('youtube_broadcast_id', input.broadcastId);

        console.log('[YouTube] Broadcast ended successfully');

        return { success: true };
      } catch (error: any) {
        console.error('[YouTube] End broadcast failed:', error);
        throw new Error(error.message || 'Failed to end YouTube broadcast');
      }
    }),

  /**
   * Get broadcast status
   */
  getBroadcastStatus: publicProcedure
    .input(z.object({
      userId: z.string(),
      broadcastId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/liveBroadcasts?part=snippet,status,statistics&id=${input.broadcastId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get broadcast status');
        }

        const data = await response.json();
        const broadcast = data.items?.[0];

        if (!broadcast) {
          return null;
        }

        return {
          id: broadcast.id,
          title: broadcast.snippet?.title,
          status: broadcast.status?.lifeCycleStatus,
          privacyStatus: broadcast.status?.privacyStatus,
          concurrentViewers: broadcast.statistics?.concurrentViewers,
          totalChatCount: broadcast.statistics?.totalChatCount,
        };
      } catch (error: any) {
        console.error('[YouTube] Get broadcast status error:', error);
        return null;
      }
    }),

  /**
   * Get stream analytics
   */
  getStreamAnalytics: publicProcedure
    .input(z.object({
      userId: z.string(),
      broadcastId: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const accessToken = await getValidAccessToken(input.userId);
        if (!accessToken) {
          throw new Error('Not authenticated with YouTube');
        }

        const response = await fetch(
          `${YOUTUBE_API_BASE}/videos?part=statistics,liveStreamingDetails&id=${input.broadcastId}`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to get stream analytics');
        }

        const data = await response.json();
        const video = data.items?.[0];

        if (!video) {
          return null;
        }

        return {
          viewCount: video.statistics?.viewCount,
          likeCount: video.statistics?.likeCount,
          commentCount: video.statistics?.commentCount,
          concurrentViewers: video.liveStreamingDetails?.concurrentViewers,
          actualStartTime: video.liveStreamingDetails?.actualStartTime,
          actualEndTime: video.liveStreamingDetails?.actualEndTime,
        };
      } catch (error: any) {
        console.error('[YouTube] Get analytics error:', error);
        return null;
      }
    }),

  /**
   * Check YouTube configuration
   */
  checkConfig: publicProcedure
    .query(async () => {
      const hasClientId = !!GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.length > 0;
      const hasClientSecret = !!GOOGLE_CLIENT_SECRET && GOOGLE_CLIENT_SECRET.length > 0;
      const hasApiKey = !!YOUTUBE_API_KEY && YOUTUBE_API_KEY.length > 0;
      const hasSupabase = !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY;

      console.log('[YouTube] Config check:', {
        hasClientId,
        hasClientSecret,
        hasApiKey,
        hasSupabase,
      });

      return {
        configured: hasClientId && hasClientSecret && hasApiKey && hasSupabase,
        hasClientId,
        hasClientSecret,
        hasApiKey,
        hasSupabase,
      };
    }),
});

export default youtubeRouter;
