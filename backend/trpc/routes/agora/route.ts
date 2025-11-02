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
});

export default agoraRouter;
