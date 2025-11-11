import Daily from '@daily-co/daily-js';

// Minimal types so the shared context compiles on web
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

export default Daily as unknown as {
  createCallObject: (opts?: { audioSource?: boolean; videoSource?: boolean }) => DailyCall;
};
