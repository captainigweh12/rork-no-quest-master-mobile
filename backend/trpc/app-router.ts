import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import agoraRoute from "./routes/agora/route";
import videosdkRoute from "./routes/videosdk/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  agora: agoraRoute,
  videosdk: videosdkRoute,
});

export type AppRouter = typeof appRouter;
