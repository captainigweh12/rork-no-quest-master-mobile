declare module '@/contexts/dailyClient' {
  export type DailyCall = {
    leave: () => Promise<void> | void;
    participants: () => Record<string, unknown>;
    setLocalVideo: (on: boolean) => void;
    setLocalAudio: (on: boolean) => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    join: (opts: { url: string; userName?: string }) => Promise<void>;
    destroy?: () => void;
  };
  export type DailyParticipant = { user_id?: string } & Record<string, unknown>;
  const Daily: {
    createCallObject: (opts?: { audioSource?: boolean; videoSource?: boolean }) => DailyCall;
  };
  export default Daily;
}
