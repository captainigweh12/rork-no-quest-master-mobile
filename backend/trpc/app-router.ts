import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import agoraRoute from "./routes/agora/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  agora: createTRPCRouter({
    ...agoraRoute._def.record, // expose nested routes as flat procedures
  }),
});

export type AppRouter = typeof appRouter;
