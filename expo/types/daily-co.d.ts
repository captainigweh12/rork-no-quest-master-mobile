declare module '@daily-co/react-native-daily-js' {
  export interface DailyCall {
    join: (options?: any) => Promise<any>;
    leave: () => Promise<void>;
    destroy: () => Promise<void>;
    participants: () => any;
    on: (event: string, handler: (e?: any) => void) => DailyCall;
    off: (event: string, handler: (e?: any) => void) => DailyCall;
    setLocalAudio: (enabled: boolean) => void;
    setLocalVideo: (enabled: boolean) => void;
  }

  export interface DailyCallFactory {
    createCallObject: (options?: any) => DailyCall;
  }

  const DailyIframe: DailyCallFactory;
  export default DailyIframe;
}
