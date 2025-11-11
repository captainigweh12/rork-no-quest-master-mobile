/**
 * Daily.co Context Provider (Native platforms)
 * Full implementation using @daily-co/react-native-daily-js.
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Daily, { DailyCall, DailyParticipant } from '@daily-co/react-native-daily-js';
import { createQuestRoom, deleteRoom, type DailyRoom } from '@/services/daily/roomManager';
import { Alert } from 'react-native';

interface DailyContextValue {
  room: DailyRoom | null;
  isInCall: boolean;
  isHost: boolean;
  participants: DailyParticipant[];
  participantCount: number;
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
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
  const ctx = useContext(DailyContext);
  if (!ctx) throw new Error('useDailyContext must be used within DailyProvider');
  return ctx;
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
  const callObjectRef = useRef<DailyCall | null>(null);

  useEffect(() => {
    if (!callObjectRef.current) {
      try {
        callObjectRef.current = Daily.createCallObject({ audioSource: true, videoSource: true });
        console.log('[Daily.co] Call object created');
      } catch (err) {
        console.error('[Daily.co] Failed to create call object:', err);
      }
    }
    return () => {
      if (callObjectRef.current) {
        callObjectRef.current.destroy();
        callObjectRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;
    const updateParticipants = () => {
      const participantsObj = callObject.participants();
      const list = Object.values(participantsObj);
      setParticipants(list);
      console.log('[Daily.co] Participants updated:', list.length);
    };
    const joined = () => { setIsInCall(true); setIsLoading(false); };
    const left = () => { setIsInCall(false); setRoom(null); setParticipants([]); };
    const errorEvt = (e?: { errorMsg?: string }) => { console.error('[Daily.co] Error:', e?.errorMsg); setError(e?.errorMsg ?? 'Unknown Daily error'); setIsLoading(false); };
    callObject.on('joined-meeting', joined);
    callObject.on('left-meeting', left);
    callObject.on('participant-joined', updateParticipants);
    callObject.on('participant-left', updateParticipants);
    callObject.on('participant-updated', updateParticipants);
    callObject.on('error', errorEvt);
    return () => {
      callObject.off('joined-meeting', joined);
      callObject.off('left-meeting', left);
      callObject.off('participant-joined', updateParticipants);
      callObject.off('participant-left', updateParticipants);
      callObject.off('participant-updated', updateParticipants);
      callObject.off('error', errorEvt);
    };
  }, []);

  const createRoom = useCallback(async (questId: string, userId: string, questTitle: string) => {
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
    const callObject = callObjectRef.current; if (!callObject) { setError('Call object not initialized'); return; }
    setIsLoading(true); setError(null); setIsHost(asHost);
    try {
      await callObject.join({ url: roomUrl, userName: asHost ? 'Host' : 'Viewer' });
    } catch (err: any) {
      console.error('[Daily.co] Join room failed:', err);
      setError(err.message || 'Failed to join room');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to join live stream. Please try again.');
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    const callObject = callObjectRef.current; if (!callObject) return;
    try {
      await callObject.leave();
      if (isHost && room) await deleteRoom(room.name);
      setRoom(null); setIsInCall(false); setIsHost(false); setParticipants([]);
    } catch (err) { console.error('[Daily.co] Leave room failed:', err); }
  }, [isHost, room]);

  const toggleCamera = useCallback(() => { const callObject = callObjectRef.current; if (!callObject) return; const next = !isCameraOn; callObject.setLocalVideo(next); setIsCameraOn(next); }, [isCameraOn]);
  const toggleMic = useCallback(() => { const callObject = callObjectRef.current; if (!callObject) return; const next = !isMicOn; callObject.setLocalAudio(next); setIsMicOn(next); }, [isMicOn]);
  const toggleScreenShare = useCallback(async () => { const callObject = callObjectRef.current; if (!callObject) return; try { if (isScreenSharing) { await callObject.stopScreenShare(); setIsScreenSharing(false); } else { await callObject.startScreenShare(); setIsScreenSharing(true); } } catch (err) { console.error('[Daily.co] Screen share toggle failed:', err); Alert.alert('Error', 'Failed to toggle screen share'); } }, [isScreenSharing]);

  const value: DailyContextValue = { room, isInCall, isHost, participants, participantCount: participants.length, isCameraOn, isMicOn, isScreenSharing, createRoom, joinRoom, leaveRoom, toggleCamera, toggleMic, toggleScreenShare, isLoading, error };
  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export type { DailyContextValue };
