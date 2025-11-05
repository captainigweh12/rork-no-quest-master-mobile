import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import agoraRoute from "./routes/agora/route";
import videosdkRouter from "./routes/videosdk/route";
import dailyRouter from "./routes/daily/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  agora: agoraRoute,
  videosdk: videosdkRouter,
  daily: dailyRouter,
});

export type AppRouter = typeof appRouter;
