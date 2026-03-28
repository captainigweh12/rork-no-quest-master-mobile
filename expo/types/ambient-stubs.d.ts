import React from "react";
// Ambient module stubs to satisfy TypeScript until real packages are installed.
declare module '@rork-ai/toolkit-sdk' {
  export function generateObject(...args: any[]): Promise<any>;
  export function generateText(...args: any[]): Promise<string>;
  export function useRorkAgent(...args: any[]): any;
  export function createRorkTool(...args: any[]): any;
}

// Dev wrapper SDK (optional, dynamically imported). Provides a wrapper component.
declare module '@rork-ai/toolkit-dev-sdk' {
  import React from 'react';
  export const RorkDevWrapper: React.ComponentType<{ children: React.ReactNode }>;
}

declare module '@daily-co/react-native-daily-js' {
  export interface DailyParticipant {
    user_id?: string;
    session_id?: string;
    audio?: boolean;
    video?: boolean;
    screen?: boolean;
    local?: boolean;
  }
  export type DailyEventName =
    | 'joined-meeting'
    | 'left-meeting'
    | 'participant-joined'
    | 'participant-left'
    | 'participant-updated'
    | 'error';
  export interface DailyEvent { participant?: DailyParticipant; errorMsg?: string }
  export interface DailyCall {
    join(opts: { url: string; userName?: string }): Promise<void>;
    leave(): Promise<void>;
    destroy(): void;
    participants(): Record<string, DailyParticipant>;
    setLocalVideo(enabled: boolean): void;
    setLocalAudio(enabled: boolean): void;
    startScreenShare(): Promise<void>;
    stopScreenShare(): Promise<void>;
    on(event: DailyEventName, handler: (ev?: DailyEvent) => void): void;
    off(event: DailyEventName, handler: (ev?: DailyEvent) => void): void;
  }
  const Daily: { createCallObject(opts?: any): DailyCall };
  export default Daily;
  export { DailyCall, DailyEvent, DailyParticipant };
}

declare module 'expo-sqlite' {
  export function openDatabase(...args: any[]): any;
}

declare module 'expo-updates' {
  export function checkForUpdateAsync(): Promise<any>;
  export function fetchUpdateAsync(): Promise<any>;
  export function reloadAsync(): Promise<void>;
}

declare module 'standardwebhooks' {
  export class Webhook { constructor(secret: string); sign(...args: any[]): string; }
}

declare const Deno: any;

declare const jest: any; // allow jest.* calls in jest.setup
