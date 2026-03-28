import { initTRPC } from '@trpc/server';
import { z } from 'zod';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export type AppRouter = typeof appRouter;

export const appRouter = router({
  // Define your procedures here
  hello: publicProcedure
    .query(() => {
      return 'Hello World!';
    }),
});