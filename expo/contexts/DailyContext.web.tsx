/**
 * Daily.co Context Provider (Web stub)
 * Provides a no-op implementation so that web bundling does not attempt to resolve
 * the native-only '@daily-co/react-native-daily-js'.
 */
import React, { createContext, useContext } from 'react';
import type { DailyRoom } from '@/services/daily/roomManager';

interface DailyContextValue {
  room: DailyRoom | null;
  isInCall: boolean;
  isHost: boolean;
  participants: any[]; // Web stub: no participant objects
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
  const value: DailyContextValue = {
    room: null,
    isInCall: false,
    isHost: false,
    participants: [],
    participantCount: 0,
    isCameraOn: false,
    isMicOn: false,
    isScreenSharing: false,
    createRoom: async () => { console.warn('[Daily.web] createRoom noop'); },
    joinRoom: async () => { console.warn('[Daily.web] joinRoom noop'); },
    leaveRoom: async () => { console.warn('[Daily.web] leaveRoom noop'); },
    toggleCamera: () => { console.warn('[Daily.web] toggleCamera noop'); },
    toggleMic: () => { console.warn('[Daily.web] toggleMic noop'); },
    toggleScreenShare: () => { console.warn('[Daily.web] toggleScreenShare noop'); },
    isLoading: false,
    error: 'Daily.co not supported on web in this build',
  };
  return <DailyContext.Provider value={value}>{children}</DailyContext.Provider>;
}

export type { DailyContextValue };
