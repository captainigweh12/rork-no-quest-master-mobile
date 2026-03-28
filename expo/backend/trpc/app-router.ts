import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import agoraRoute from "./routes/agora/route";
import videosdkRouter from "./routes/videosdk/route";
import dailyRouter from "./routes/daily/route";
import youtubeRouter from "./routes/youtube/route";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  agora: agoraRoute,
  videosdk: videosdkRouter,
  daily: dailyRouter,
  youtube: youtubeRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
