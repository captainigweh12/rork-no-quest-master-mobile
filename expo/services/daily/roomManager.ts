/**
 * Daily.co Room Management Service
 * 
 * Handles creation, deletion, and management of Daily.co video rooms
 * for live quest streaming.
 */

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

export interface DailyRoom {
  id: string;
  name: string;
  url: string;
  created_at: string;
  config: {
    max_participants?: number;
    enable_recording?: string;
    enable_chat?: boolean;
    enable_screenshare?: boolean;
  };
}

export interface CreateRoomParams {
  questId: string;
  userId: string;
  questTitle: string;
  maxParticipants?: number;
  enableRecording?: boolean;
}

/**
 * Create a new Daily.co room for quest streaming
 */
export async function createQuestRoom(params: CreateRoomParams): Promise<DailyRoom> {
  const { questId, userId, questTitle, maxParticipants = 50, enableRecording = true } = params;
  
  const roomName = `quest-${questId}-${Date.now()}`;
  
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
          max_participants: maxParticipants,
          enable_recording: enableRecording ? 'cloud' : 'off',
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
          questId,
          userId,
          questTitle,
          createdAt: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create room: ${error.error || response.statusText}`);
    }

    const room = await response.json();
    console.log('[Daily.co] Room created:', room.name, '| URL:', room.url);
    
    return room;
  } catch (error) {
    console.error('[Daily.co] Create room error:', error);
    throw error;
  }
}

/**
 * Delete a Daily.co room
 */
export async function deleteRoom(roomName: string): Promise<void> {
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const error = await response.json();
      throw new Error(`Failed to delete room: ${error.error || response.statusText}`);
    }

    console.log('[Daily.co] Room deleted:', roomName);
  } catch (error) {
    console.error('[Daily.co] Delete room error:', error);
    throw error;
  }
}

/**
 * Get room information
 */
export async function getRoom(roomName: string): Promise<DailyRoom | null> {
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms/${roomName}`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get room: ${error.error || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Daily.co] Get room error:', error);
    return null;
  }
}

/**
 * List all active rooms
 */
export async function listRooms(): Promise<DailyRoom[]> {
  try {
    const response = await fetch(`${DAILY_API_URL}/rooms`, {
      headers: {
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to list rooms: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('[Daily.co] List rooms error:', error);
    return [];
  }
}

/**
 * Get meeting token for a room (optional, for additional security)
 */
export async function getMeetingToken(roomName: string, userId: string, isOwner: boolean = false): Promise<string> {
  try {
    const response = await fetch(`${DAILY_API_URL}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_id: userId,
          is_owner: isOwner,
          enable_recording: isOwner,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get meeting token: ${error.error || response.statusText}`);
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('[Daily.co] Get meeting token error:', error);
    throw error;
  }
}
