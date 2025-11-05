import { router, publicProcedure } from '../trpc';

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, ts: Date.now() }))
});