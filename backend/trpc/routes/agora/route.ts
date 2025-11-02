import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '../../create-context';
import { createResource, startRecording, stopRecording, queryRecording, envSummary } from '../../../services/agora';

const createResourceInput = z.object({
  cname: z.string().min(1),
  uid: z.string().min(1),
  region: z.enum(['ap','eu','na','sa','in','jp','kr','sg','us']).optional(),
});

const startRecordingInput = z.object({
  resourceId: z.string().min(1),
  cname: z.string().min(1),
  uid: z.string().min(1),
  token: z.string().min(1),
  region: z.enum(['ap','eu','na','sa','in','jp','kr','sg','us']).optional(),
});

const stopRecordingInput = z.object({
  resourceId: z.string().min(1),
  sid: z.string().min(1),
  cname: z.string().min(1),
  uid: z.string().min(1),
  region: z.enum(['ap','eu','na','sa','in','jp','kr','sg','us']).optional(),
});

const queryRecordingInput = z.object({
  resourceId: z.string().min(1),
  sid: z.string().min(1),
  region: z.enum(['ap','eu','na','sa','in','jp','kr','sg','us']).optional(),
});

const mintRTCInput = z.object({
  channelName: z.string().min(1),
  uid: z.string().min(1),
  role: z.enum(['publisher', 'subscriber']),
  expireSeconds: z.number().int().min(60).max(86400),
});

const agoraRouter = createTRPCRouter({
  env: publicProcedure.query(async () => {
    const summary = envSummary();
    return {
      ...summary,
    };
  }),
  acquire: publicProcedure.input(createResourceInput).mutation(async ({ input }) => {
    const res = await createResource(input);
    return res;
  }),
  start: publicProcedure.input(startRecordingInput).mutation(async ({ input }) => {
    const res = await startRecording(input);
    return res;
  }),
  stop: publicProcedure.input(stopRecordingInput).mutation(async ({ input }) => {
    const res = await stopRecording(input);
    return res;
  }),
  query: publicProcedure.input(queryRecordingInput).query(async ({ input }) => {
    const res = await queryRecording(input);
    return res;
  }),
  rtcMint: publicProcedure.input(mintRTCInput).mutation(async ({ input, ctx }) => {
    const headerKey = ctx.req.headers.get('X-AGORA-MINT-KEY') ?? ctx.req.headers.get('x-agora-mint-key');
    const secret = process.env.MINT_RTC_TOKEN_SECRET ?? '';

    if (!secret) {
      throw new Error('Server misconfigured: MINT_RTC_TOKEN_SECRET not set');
    }
    if (!headerKey || headerKey !== secret) {
      throw new Error('Unauthorized');
    }

    const appId = process.env.AGORA_APP_ID ?? '';
    const appCertificate = process.env.AGORA_APP_CERTIFICATE ?? '';
    if (!appId || !appCertificate) {
      throw new Error('Server misconfigured: missing AGORA_APP_ID or AGORA_APP_CERTIFICATE');
    }

    const now = Math.floor(Date.now() / 1000);
    const expireAt = now + input.expireSeconds;

    // TODO: Implement AccessToken2 (007) minting correctly.
    // For now, we throw to avoid issuing invalid credentials.
    throw new Error('AccessToken2 minting not yet implemented');

    // return { token, expireAt };
  }),
});

export default agoraRouter;
