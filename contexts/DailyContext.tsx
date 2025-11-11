/**
 * Daily.co Context Provider (shared)
 * Uses a platform bridge (./dailyClient) to resolve to the correct SDK.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Daily, { type DailyCall, type DailyParticipant } from '@/contexts/dailyClient';
import { createQuestRoom, deleteRoom, type DailyRoom } from '@/services/daily/roomManager';
import { Alert, Platform } from 'react-native';

interface DailyContextValue {
  room: DailyRoom | null;
  isInCall: boolean;
  isHost: boolean;
  participants: DailyParticipant[];
  participantCount: number;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  isSupported: boolean;
  supportReason?: string | null;
  capabilities: { canJoin: boolean; canPublish: boolean; canScreenShare: boolean };
  createRoom: (questId: string, userId: string, questTitle: string) => Promise<void>;
  joinRoom: (roomUrl: string, isHost?: boolean) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleCamera: () => void;
  toggleMic: () => void;
  toggleScreenShare: () => void;
  isLoading: boolean;
  error: string | null;
}

const DailyContext = createContext<DailyContextValue | null>(null);

export function useDailyContext() {
  const context = useContext(DailyContext);
  if (!context) {
    throw new Error('useDailyContext must be used within DailyProvider');
  }
  return context;
}

export function DailyProvider({ children }: { children: React.ReactNode }) {
  const [room, setRoom] = useState<DailyRoom | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [participants, setParticipants] = useState<DailyParticipant[]>([]);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const [supportReason, setSupportReason] = useState<string | null>(null);

  const callObjectRef = useRef<DailyCall | null>(null);

  // Feature flag and platform detection
  const enabledFlag = (process.env.EXPO_PUBLIC_DAILY_ENABLED ?? 'true').toString().toLowerCase();
  const isEnabled = enabledFlag !== 'false' && enabledFlag !== '0' && enabledFlag !== 'off';
  const isWeb = Platform.OS === 'web';
  const defaultCapabilities = { canJoin: isEnabled, canPublish: isEnabled, canScreenShare: isEnabled } as const;

  useEffect(() => {
    if (!callObjectRef.current) {
      if (!isEnabled) {
        setIsSupported(false);
        setSupportReason('Daily is disabled by feature flag (EXPO_PUBLIC_DAILY_ENABLED=false).');
        return;
      }
      try {
        callObjectRef.current = Daily.createCallObject({ audioSource: true, videoSource: true });
        setIsSupported(true);
        setSupportReason(null);
      } catch (err) {
        console.error('[Daily.co] Failed to create call object:', err);
        setIsSupported(false);
        setSupportReason(isWeb ? 'Daily web SDK unavailable.' : 'Daily native SDK unavailable. Use a dev build with the native module installed.');
      }
    }
    return () => {
      if (callObjectRef.current && typeof (callObjectRef.current as any).destroy === 'function') {
        (callObjectRef.current as any).destroy();
      }
      callObjectRef.current = null;
    };
  }, [isEnabled, isWeb]);

  useEffect(() => {
    const callObject: any = callObjectRef.current;
    if (!callObject || typeof callObject.on !== 'function') return;
    const handleJoinedMeeting = () => { setIsInCall(true); setIsLoading(false); };
    const handleLeftMeeting = () => { setIsInCall(false); setRoom(null); setParticipants([]); };
    const updateParticipants = () => {
      if (typeof callObject.participants === 'function') {
        const participantsObj = callObject.participants();
        const participantsList = Object.values(participantsObj ?? {}) as DailyParticipant[];
        setParticipants(participantsList);
      }
    };
    const handleError = (event?: { errorMsg?: string }) => { setError(event?.errorMsg ?? 'Unknown Daily error'); setIsLoading(false); };
    callObject.on?.('joined-meeting', handleJoinedMeeting);
    callObject.on?.('left-meeting', handleLeftMeeting);
    callObject.on?.('participant-joined', updateParticipants);
    callObject.on?.('participant-left', updateParticipants);
    callObject.on?.('participant-updated', updateParticipants);
    callObject.on?.('error', handleError);
    return () => {
      callObject.off?.('joined-meeting', handleJoinedMeeting);
      callObject.off?.('left-meeting', handleLeftMeeting);
      callObject.off?.('participant-joined', updateParticipants);
      callObject.off?.('participant-left', updateParticipants);
      callObject.off?.('participant-updated', updateParticipants);
      callObject.off?.('error', handleError);
    };
  }, []);

  const createRoom = useCallback(async (questId: string, userId: string, questTitle: string) => {
    if (!isSupported) { Alert.alert('Live streaming unavailable', supportReason ?? 'Daily not supported here.'); return; }
    setIsLoading(true); setError(null);
    try {
      const newRoom = await createQuestRoom({ questId, userId, questTitle, maxParticipants: 50, enableRecording: true });
      setRoom(newRoom);
      await joinRoom(newRoom.url, true);
    } catch (err: any) {
      console.error('[Daily.co] Create room failed:', err);
      setError(err.message || 'Failed to create room');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to create live stream room. Please try again.');
    }
  }, []);

  const joinRoom = useCallback(async (roomUrl: string, asHost: boolean = false) => {
    const callObject = callObjectRef.current as any;
    if (!isSupported) { Alert.alert('Live streaming unavailable', supportReason ?? 'Daily not supported here.'); return; }
    if (!callObject) { setError('Call object not initialized'); return; }
    setIsLoading(true); setError(null); setIsHost(asHost);
    try {
      await callObject.join?.({ url: roomUrl, userName: asHost ? 'Host' : 'Viewer' });
    } catch (err: any) {
      console.error('[Daily.co] Join room failed:', err);
      setError(err.message || 'Failed to join room');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to join live stream. Please try again.');
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    const callObject = callObjectRef.current as any; if (!callObject) return;
    try {
      await callObject.leave?.();
      if (isHost && room) await deleteRoom(room.name);
      setRoom(null); setIsInCall(false); setIsHost(false); setParticipants([]);
    } catch (err) {
      console.error('[Daily.co] Leave room failed:', err);
    }
  }, [isHost, room]);

  const toggleCamera = useCallback(() => { if (!isSupported) { Alert.alert('Camera unavailable', supportReason ?? 'Daily not supported here.'); return; } const callObject = callObjectRef.current as any; if (!callObject) return; const next = !isCameraOn; callObject.setLocalVideo?.(next); setIsCameraOn(next); }, [isCameraOn, isSupported, supportReason]);
  const toggleMic = useCallback(() => { if (!isSupported) { Alert.alert('Microphone unavailable', supportReason ?? 'Daily not supported here.'); return; } const callObject = callObjectRef.current as any; if (!callObject) return; const next = !isMicOn; callObject.setLocalAudio?.(next); setIsMicOn(next); }, [isMicOn, isSupported, supportReason]);
  const toggleScreenShare = useCallback(async () => { if (!isSupported) { Alert.alert('Screen share unavailable', supportReason ?? 'Daily not supported here.'); return; } const callObject = callObjectRef.current as any; if (!callObject) return; try { if (isScreenSharing) { await callObject.stopScreenShare?.(); setIsScreenSharing(false); } else { await callObject.startScreenShare?.(); setIsScreenSharing(true); } } catch (err) { console.error('[Daily.co] Screen share toggle failed:', err); Alert.alert('Error', 'Failed to toggle screen share'); } }, [isScreenSharing, isSupported, supportReason]);

  const value: DailyContextValue = { room, isInCall, isHost, participants, participantCount: participants.length, isCameraOn, isMicOn, isScreenSharing, isSupported, supportReason, capabilities: defaultCapabilities, createRoom, joinRoom, leaveRoom, toggleCamera, toggleMic, toggleScreenShare, isLoading, error };
  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export type { DailyContextValue };
 
