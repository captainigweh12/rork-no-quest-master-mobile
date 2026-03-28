import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

export const dailyRouter = router({
  /**
   * Create a new Daily.co room for quest streaming
   */
  createRoom: publicProcedure
    .input(z.object({
      questId: z.string(),
      userId: z.string(),
      questTitle: z.string(),
      maxParticipants: z.number().optional().default(50),
    }))
    .mutation(async ({ input }) => {
      const roomName = `quest-${input.questId}-${Date.now()}`;
      
      console.log('[Daily.co] Creating room:', roomName);
      
      try {
        const response = await fetch(`${DAILY_API_URL}/rooms`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            name: roomName,
            privacy: 'public',
            properties: {
              max_participants: input.maxParticipants,
              enable_recording: 'cloud',
              enable_chat: true,
              enable_screenshare: true,
              enable_emoji_reactions: true,
              start_video_off: false,
              start_audio_off: false,
              owner_only_broadcast: false,
              enable_network_ui: true,
              enable_prejoin_ui: false,
            },
            metadata: {
              questId: input.questId,
              userId: input.userId,
              questTitle: input.questTitle,
              createdAt: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Daily.co] Create room error:', error);
          throw new Error(`Failed to create room: ${error.error || response.statusText}`);
        }

        const room = await response.json();
        console.log('[Daily.co] Room created successfully:', room.name);
        
        return {
          id: room.id,
          name: room.name,
          url: room.url,
          created_at: room.created_at,
          config: room.config,
        };
      } catch (error: any) {
        console.error('[Daily.co] Create room failed:', error);
        throw new Error(error.message || 'Failed to create Daily.co room');
      }
    }),

  /**
   * Delete a Daily.co room
   */
  deleteRoom: publicProcedure
    .input(z.object({ 
      roomName: z.string() 
    }))
    .mutation(async ({ input }) => {
      console.log('[Daily.co] Deleting room:', input.roomName);
      
      try {
        const response = await fetch(`${DAILY_API_URL}/rooms/${input.roomName}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });

        if (!response.ok && response.status !== 404) {
          const error = await response.json();
          console.error('[Daily.co] Delete room error:', error);
          throw new Error(`Failed to delete room: ${error.error || response.statusText}`);
        }

        console.log('[Daily.co] Room deleted successfully');
        return { success: true };
      } catch (error: any) {
        console.error('[Daily.co] Delete room failed:', error);
        throw new Error(error.message || 'Failed to delete room');
      }
    }),

  /**
   * Get room information
   */
  getRoom: publicProcedure
    .input(z.object({ 
      roomName: z.string() 
    }))
    .query(async ({ input }) => {
      console.log('[Daily.co] Getting room:', input.roomName);
      
      try {
        const response = await fetch(`${DAILY_API_URL}/rooms/${input.roomName}`, {
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });

        if (response.status === 404) {
          console.log('[Daily.co] Room not found');
          return null;
        }

        if (!response.ok) {
          const error = await response.json();
          console.error('[Daily.co] Get room error:', error);
          throw new Error(`Failed to get room: ${error.error || response.statusText}`);
        }

        const room = await response.json();
        return {
          id: room.id,
          name: room.name,
          url: room.url,
          created_at: room.created_at,
          config: room.config,
        };
      } catch (error: any) {
        console.error('[Daily.co] Get room failed:', error);
        return null;
      }
    }),

  /**
   * List all active rooms
   */
  listRooms: publicProcedure
    .query(async () => {
      console.log('[Daily.co] Listing all rooms');
      
      try {
        const response = await fetch(`${DAILY_API_URL}/rooms`, {
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Daily.co] List rooms error:', error);
          throw new Error(`Failed to list rooms: ${error.error || response.statusText}`);
        }

        const data = await response.json();
        return data.data || [];
      } catch (error: any) {
        console.error('[Daily.co] List rooms failed:', error);
        return [];
      }
    }),

  /**
   * Get meeting token for enhanced security (optional)
   */
  getMeetingToken: publicProcedure
    .input(z.object({
      roomName: z.string(),
      userId: z.string(),
      isOwner: z.boolean().optional().default(false),
    }))
    .mutation(async ({ input }) => {
      console.log('[Daily.co] Getting meeting token for:', input.roomName);
      
      try {
        const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DAILY_API_KEY}`,
          },
          body: JSON.stringify({
            properties: {
              room_name: input.roomName,
              user_id: input.userId,
              is_owner: input.isOwner,
              enable_recording: input.isOwner,
            },
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error('[Daily.co] Get meeting token error:', error);
          throw new Error(`Failed to get meeting token: ${error.error || response.statusText}`);
        }

        const data = await response.json();
        return { token: data.token };
      } catch (error: any) {
        console.error('[Daily.co] Get meeting token failed:', error);
        throw new Error(error.message || 'Failed to get meeting token');
      }
    }),

  /**
   * Check Daily.co configuration
   */
  checkConfig: publicProcedure
    .query(async () => {
      const hasApiKey = !!DAILY_API_KEY && DAILY_API_KEY.length > 0;
      
      console.log('[Daily.co] Config check - API Key present:', hasApiKey);
      
      return {
        configured: hasApiKey,
        apiKeyPresent: hasApiKey,
        apiUrl: DAILY_API_URL,
      };
    }),
});
