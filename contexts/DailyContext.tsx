/**
 * Daily.co Context Provider
 * 
 * Manages Daily.co call state, room management, and streaming functionality
 */

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import Daily, { DailyCall, DailyParticipant } from '@daily-co/react-native-daily-js';
import { createQuestRoom, deleteRoom, type DailyRoom } from '@/services/daily/roomManager';
import { Alert } from 'react-native';

interface DailyContextValue {
  // Room state
  room: DailyRoom | null;
  isInCall: boolean;
  isHost: boolean;
  
  // Participants
  participants: DailyParticipant[];
  participantCount: number;
  
  // Media state
  isCameraOn: boolean;
  isMicOn: boolean;
  isScreenSharing: boolean;
  
  // Actions
  createRoom: (questId: string, userId: string, questTitle: string) => Promise<void>;
  joinRoom: (roomUrl: string, isHost?: boolean) => Promise<void>;
  leaveRoom: () => Promise<void>;
  toggleCamera: () => void;
  toggleMic: () => void;
  toggleScreenShare: () => void;
  
  // Status
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
  
  const callObjectRef = useRef<DailyCall | null>(null);

  // Initialize Daily call object
  useEffect(() => {
    if (!callObjectRef.current) {
      try {
        callObjectRef.current = Daily.createCallObject({
          audioSource: true,
          videoSource: true,
        });
        
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

  // Set up event listeners
  useEffect(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const handleJoinedMeeting = () => {
      console.log('[Daily.co] Joined meeting');
      setIsInCall(true);
      setIsLoading(false);
    };

    const handleLeftMeeting = () => {
      console.log('[Daily.co] Left meeting');
      setIsInCall(false);
      setRoom(null);
      setParticipants([]);
    };

    const handleParticipantJoined = (event?: { participant?: DailyParticipant }) => {
      if (event?.participant?.user_id) {
        console.log('[Daily.co] Participant joined:', event.participant.user_id);
      }
      updateParticipants();
    };

    const handleParticipantLeft = (event?: { participant?: DailyParticipant }) => {
      if (event?.participant?.user_id) {
        console.log('[Daily.co] Participant left:', event.participant.user_id);
      }
      updateParticipants();
    };

    const handleParticipantUpdated = () => {
      updateParticipants();
    };

    const handleError = (event?: { errorMsg?: string }) => {
      console.error('[Daily.co] Error:', event?.errorMsg);
      setError(event?.errorMsg ?? 'Unknown Daily error');
      setIsLoading(false);
    };

    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-left', handleParticipantLeft);
    callObject.on('participant-updated', handleParticipantUpdated);
    callObject.on('error', handleError);

    return () => {
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-left', handleParticipantLeft);
      callObject.off('participant-updated', handleParticipantUpdated);
      callObject.off('error', handleError);
    };
  }, []);

  const updateParticipants = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const participantsObj = callObject.participants();
    const participantsList = Object.values(participantsObj);
    setParticipants(participantsList);
    
    console.log('[Daily.co] Participants updated:', participantsList.length);
  }, []);

  const createRoom = useCallback(async (questId: string, userId: string, questTitle: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[Daily.co] Creating room for quest:', questId);
      
      const newRoom = await createQuestRoom({
        questId,
        userId,
        questTitle,
        maxParticipants: 50,
        enableRecording: true,
      });
      
      setRoom(newRoom);
      console.log('[Daily.co] Room created successfully:', newRoom.url);
      
      // Automatically join as host
      await joinRoom(newRoom.url, true);
    } catch (err: any) {
      console.error('[Daily.co] Create room failed:', err);
      setError(err.message || 'Failed to create room');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to create live stream room. Please try again.');
    }
  }, []);

  const joinRoom = useCallback(async (roomUrl: string, asHost: boolean = false) => {
    const callObject = callObjectRef.current;
    if (!callObject) {
      setError('Call object not initialized');
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsHost(asHost);
    
    try {
      console.log('[Daily.co] Joining room:', roomUrl, '| As host:', asHost);
      
      await callObject.join({
        url: roomUrl,
        userName: asHost ? 'Host' : 'Viewer',
      });
      
      console.log('[Daily.co] Successfully joined room');
    } catch (err: any) {
      console.error('[Daily.co] Join room failed:', err);
      setError(err.message || 'Failed to join room');
      setIsLoading(false);
      Alert.alert('Error', 'Failed to join live stream. Please try again.');
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      console.log('[Daily.co] Leaving room');
      
      await callObject.leave();
      
      // If host, delete the room
      if (isHost && room) {
        console.log('[Daily.co] Host leaving - deleting room');
        await deleteRoom(room.name);
      }
      
      setRoom(null);
      setIsInCall(false);
      setIsHost(false);
      setParticipants([]);
    } catch (err) {
      console.error('[Daily.co] Leave room failed:', err);
    }
  }, [isHost, room]);

  const toggleCamera = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const newState = !isCameraOn;
    callObject.setLocalVideo(newState);
    setIsCameraOn(newState);
    
    console.log('[Daily.co] Camera toggled:', newState ? 'ON' : 'OFF');
  }, [isCameraOn]);

  const toggleMic = useCallback(() => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    const newState = !isMicOn;
    callObject.setLocalAudio(newState);
    setIsMicOn(newState);
    
    console.log('[Daily.co] Mic toggled:', newState ? 'ON' : 'OFF');
  }, [isMicOn]);

  const toggleScreenShare = useCallback(async () => {
    const callObject = callObjectRef.current;
    if (!callObject) return;

    try {
      if (isScreenSharing) {
        await callObject.stopScreenShare();
        setIsScreenSharing(false);
        console.log('[Daily.co] Screen share stopped');
      } else {
        await callObject.startScreenShare();
        setIsScreenSharing(true);
        console.log('[Daily.co] Screen share started');
      }
    } catch (err) {
      console.error('[Daily.co] Screen share toggle failed:', err);
      Alert.alert('Error', 'Failed to toggle screen share');
    }
  }, [isScreenSharing]);

  const value: DailyContextValue = {
    room,
    isInCall,
    isHost,
    participants,
    participantCount: participants.length,
    isCameraOn,
    isMicOn,
    isScreenSharing,
    createRoom,
    joinRoom,
    leaveRoom,
    toggleCamera,
    toggleMic,
    toggleScreenShare,
    isLoading,
    error,
  };

  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}
