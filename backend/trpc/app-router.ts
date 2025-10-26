import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import sendVerificationEmailRoute from "./routes/auth/send-verification-email/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  auth: createTRPCRouter({
    sendVerificationEmail: sendVerificationEmailRoute,
  }),
});

export type AppRouter = typeof appRouter;
