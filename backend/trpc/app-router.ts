import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import agoraRoute from "./routes/agora/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  agora: agoraRoute,
});

export type AppRouter = typeof appRouter;
