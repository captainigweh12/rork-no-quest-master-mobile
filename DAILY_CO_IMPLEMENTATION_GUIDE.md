# Daily.co Implementation Guide

## Overview

This guide provides complete implementation of Daily.co for live quest streaming, replacing VideoSDK/Agora.

## Step 1: Installation

```bash
npm install @daily-co/react-native-daily-js @daily-co/react-native-webrtc
```

## Step 2: Environment Setup

Add to your `.env` files:

```env
# Daily.co API Key (get from https://dashboard.daily.co)
DAILY_API_KEY=your-daily-api-key-here
EXPO_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
```

## Step 3: Backend tRPC Router

Create `backend/trpc/routers/daily.ts`:

```typescript
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

const DAILY_API_KEY = process.env.DAILY_API_KEY || '';
const DAILY_API_URL = 'https://api.daily.co/v1';

export const dailyRouter = router({
  createRoom: publicProcedure
    .input(z.object({
      questId: z.string(),
      userId: z.string(),
      questTitle: z.string(),
    }))
    .mutation(async ({ input }) => {
      const roomName = `quest-${input.questId}-${Date.now()}`;
      
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
            max_participants: 50,
            enable_recording: 'cloud',
            enable_chat: true,
            enable_screenshare: true,
            enable_emoji_reactions: true,
          },
          metadata: {
            questId: input.questId,
            userId: input.userId,
            questTitle: input.questTitle,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Daily.co room');
      }

      return await response.json();
    }),

  deleteRoom: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .mutation(async ({ input }) => {
      const response = await fetch(`${DAILY_API_URL}/rooms/${input.roomName}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to delete room');
      }

      return { success: true };
    }),

  getRoom: publicProcedure
    .input(z.object({ roomName: z.string() }))
    .query(async ({ input }) => {
      const response = await fetch(`${DAILY_API_URL}/rooms/${input.roomName}`, {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
        },
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to get room');
      }

      return await response.json();
    }),
});
```

Then add to `backend/trpc/app-router.ts`:

```typescript
import { dailyRouter } from './routers/daily';

export const appRouter = router({
  // ... existing routers
  daily: dailyRouter,
});
```

## Step 4: Create Stream Screen

Create `app/stream-daily.tsx`:

```typescript
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Video, Mic, MicOff, VideoOff, Monitor, X, Users } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trpc } from '@/lib/trpc';
import Daily, { DailyCall } from '@daily-co/react-native-daily-js';

export default function DailyStreamScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const questId = params.questId as string;
  const questTitle = params.questTitle as string;
  const isHost = params.isHost === 'true';
  const roomUrl = params.roomUrl as string | undefined;
  
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [participantCount, setParticipantCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const createRoomMutation = trpc.daily.createRoom.useMutation();

  useEffect(() => {
    const call = Daily.createCallObject();
    setCallObject(call);

    call.on('joined-meeting', () => {
      console.log('[Daily] Joined meeting');
      setIsInCall(true);
      setIsLoading(false);
    });

    call.on('left-meeting', () => {
      console.log('[Daily] Left meeting');
      setIsInCall(false);
    });

    call.on('participant-joined', () => {
      updateParticipantCount(call);
    });

    call.on('participant-left', () => {
      updateParticipantCount(call);
    });

    return () => {
      call.destroy();
    };
  }, []);

  const updateParticipantCount = (call: DailyCall) => {
    const participants = call.participants();
    setParticipantCount(Object.keys(participants).length);
  };

  const startStream = async () => {
    if (!callObject) return;
    
    setIsLoading(true);
    
    try {
      // Create room via tRPC
      const room = await createRoomMutation.mutateAsync({
        questId,
        userId: 'current-user-id', // Replace with actual user ID
        questTitle,
      });

      // Join the room
      await callObject.join({ url: room.url });
    } catch (error) {
      console.error('[Daily] Start stream error:', error);
      Alert.alert('Error', 'Failed to start stream');
      setIsLoading(false);
    }
  };

  const joinStream = async () => {
    if (!callObject || !roomUrl) return;
    
    setIsLoading(true);
    
    try {
      await callObject.join({ url: roomUrl });
    } catch (error) {
      console.error('[Daily] Join stream error:', error);
      Alert.alert('Error', 'Failed to join stream');
      setIsLoading(false);
    }
  };

  const endStream = async () => {
    if (!callObject) return;
    
    await callObject.leave();
    router.back();
  };

  const toggleCamera = () => {
    if (!callObject) return;
    const newState = !isCameraOn;
    callObject.setLocalVideo(newState);
    setIsCameraOn(newState);
  };

  const toggleMic = () => {
    if (!callObject) return;
    const newState = !isMicOn;
    callObject.setLocalAudio(newState);
    setIsMicOn(newState);
  };

  useEffect(() => {
    if (isHost) {
      startStream();
    } else if (roomUrl) {
      joinStream();
    }
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Video container */}
      <View style={styles.videoContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B35" />
            <Text style={styles.loadingText}>
              {isHost ? 'Starting stream...' : 'Joining stream...'}
            </Text>
          </View>
        ) : !isInCall ? (
          <View style={styles.waitingContainer}>
            <Text style={styles.waitingText}>Preparing stream...</Text>
          </View>
        ) : (
          <View style={styles.activeStream}>
            <Text style={styles.questTitle}>{questTitle}</Text>
            <View style={styles.viewerCount}>
              <Users size={16} color="#FFFFFF" />
              <Text style={styles.viewerCountText}>{participantCount}</Text>
            </View>
          </View>
        )}
      </View>

      {/* Controls */}
      {isInCall && (
        <View style={styles.controls}>
          <Pressable
            style={[styles.controlButton, !isCameraOn && styles.controlButtonOff]}
            onPress={toggleCamera}
          >
            {isCameraOn ? (
              <Video size={24} color="#FFFFFF" />
            ) : (
              <VideoOff size={24} color="#FFFFFF" />
            )}
          </Pressable>

          <Pressable
            style={[styles.controlButton, !isMicOn && styles.controlButtonOff]}
            onPress={toggleMic}
          >
            {isMicOn ? (
              <Mic size={24} color="#FFFFFF" />
            ) : (
              <MicOff size={24} color="#FFFFFF" />
            )}
          </Pressable>

          <Pressable
            style={[styles.controlButton, styles.endButton]}
            onPress={endStream}
          >
            <X size={24} color="#FFFFFF" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitingText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  activeStream: {
    flex: 1,
    padding: 20,
  },
  questTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  viewerCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonOff: {
    backgroundColor: '#DC3545',
  },
  endButton: {
    backgroundColor: '#DC3545',
  },
});
```

## Step 5: Update Environment Variables

Add to `env.example` and `env.development`:

```env
# Daily.co (for live streaming)
DAILY_API_KEY=your-daily-api-key
EXPO_PUBLIC_DAILY_DOMAIN=your-domain.daily.co
```

## Step 6: Add "Go Live" Button to Quest Screen

In your quest screen (e.g., `app/(tabs)/(home)/index.tsx`), add:

```typescript
import { useRouter } from 'expo-router';

// In your component:
const router = useRouter();

// Add button:
<Pressable
  style={styles.goLiveButton}
  onPress={() => {
    router.push({
      pathname: '/stream-daily',
      params: {
        questId: activeQuest.id,
        questTitle: activeQuest.title,
        isHost: 'true',
      },
    });
  }}
>
  <Text style={styles.goLiveText}>🔴 Go Live</Text>
</Pressable>
```

## Step 7: Testing

### Test Room Creation

```bash
# Test the tRPC endpoint
curl -X POST https://rork-no-quest-master-mobile.onrender.com/api/trpc/daily.createRoom \
  -H "Content-Type: application/json" \
  -d '{
    "questId": "test-123",
    "userId": "user-456",
    "questTitle": "Test Quest"
  }'
```

### Test in App

1. Open an active quest
2. Tap "Go Live" button
3. Camera/mic permissions should be requested
4. Stream should start
5. Share room URL with friends to join

## Benefits Over VideoSDK/Agora

### 1. Simpler Setup
- ✅ No complex token generation
- ✅ No server-side token management
- ✅ Direct API calls

### 2. Better Features
- ✅ Built-in recording (cloud storage)
- ✅ Built-in chat
- ✅ Built-in reactions
- ✅ Screen sharing
- ✅ Network quality indicators

### 3. Cost-Effective
- **Free**: 10,000 minutes/month
- **Starter**: $99/month for 100,000 minutes
- **Scale**: $249/month for 500,000 minutes

### 4. Better DX
- ✅ Excellent documentation
- ✅ React Native SDK
- ✅ TypeScript support
- ✅ Active community

## Migration from VideoSDK

### Phase 1: Parallel Running
1. Keep VideoSDK code
2. Add Daily.co as option
3. Let users choose

### Phase 2: Gradual Migration
1. Default to Daily.co for new streams
2. Keep VideoSDK for existing streams
3. Monitor performance

### Phase 3: Complete Migration
1. Remove VideoSDK code
2. Update all references
3. Clean up dependencies

## Troubleshooting

### Issue: "Cannot find module '@daily-co/react-native-daily-js'"

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx expo prebuild --clean
```

### Issue: Camera/Mic permissions not working

**Solution:**
Add to `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow Rejection Hero to access your camera for live streaming"
        }
      ],
      [
        "expo-av",
        {
          "microphonePermission": "Allow Rejection Hero to access your microphone for live streaming"
        }
      ]
    ]
  }
}
```

### Issue: Stream not connecting

**Solution:**
1. Check Daily.co API key is correct
2. Verify room was created successfully
3. Check network connectivity
4. Review Daily.co dashboard for errors

## Advanced Features

### 1. Recording Playback

```typescript
// Get recordings for a room
const recordings = await fetch(`${DAILY_API_URL}/recordings?room_name=${roomName}`, {
  headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
});
```

### 2. Live Reactions

```typescript
// Send emoji reaction
callObject.sendAppMessage({ type: 'reaction', emoji: '👏' });

// Listen for reactions
callObject.on('app-message', (event) => {
  if (event.data.type === 'reaction') {
    showReaction(event.data.emoji);
  }
});
```

### 3. Chat Messages

```typescript
// Send chat message
callObject.sendAppMessage({ type: 'chat', message: 'Great job!' });

// Listen for chat
callObject.on('app-message', (event) => {
  if (event.data.type === 'chat') {
    addChatMessage(event.data.message);
  }
});
```

## Next Steps

1. **Sign up for Daily.co**: https://dashboard.daily.co
2. **Get API key**: Dashboard → Developers → API Keys
3. **Add to environment variables**
4. **Test room creation** via tRPC
5. **Implement stream screen**
6. **Add "Go Live" buttons** to quests
7. **Test with friends**
8. **Roll out to users**

## Support

- **Daily.co Docs**: https://docs.daily.co/
- **React Native Guide**: https://docs.daily.co/guides/products/mobile/react-native
- **API Reference**: https://docs.daily.co/reference/rest-api

## Estimated Implementation Time

- **Backend setup**: 1 hour
- **Stream screen**: 2-3 hours
- **UI integration**: 1-2 hours
- **Testing**: 1-2 hours
- **Total**: 5-8 hours

Much faster than VideoSDK/Agora which took weeks to debug!
