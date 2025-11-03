// backend/trpc/routes/agora/route.ts
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure } from "../../create-context";
import {
  createResource,
  startRecording,
  stopRecording,
  queryRecording,
  envSummary,
} from "../../../services/agora";
import { buildRtc007Token } from "../../../services/agora-token2";

const Regions = z.enum(["ap", "eu", "na", "sa", "in", "jp", "kr", "sg", "us"]);

const createResourceInput = z.object({
  cname: z.string().min(1),
  uid: z.string().min(1), // string uid recommended by Agora REST
  region: Regions.optional(),
});

const startRecordingInput = z.object({
  resourceId: z.string().min(1),
  cname: z.string().min(1),
  uid: z.string().min(1),
  token: z.string().min(1), // RTC token used by Agora Cloud Recording to join
  region: Regions.optional(),
});

const stopRecordingInput = z.object({
  resourceId: z.string().min(1),
  sid: z.string().min(1),
  cname: z.string().min(1),
  uid: z.string().min(1),
  region: Regions.optional(),
});

const queryRecordingInput = z.object({
  resourceId: z.string().min(1),
  sid: z.string().min(1),
  region: Regions.optional(),
});

const mintRTCInput = z.object({
  channelName: z.string().min(1),
  uid: z.string().min(1),
  role: z.enum(["publisher", "subscriber"]),
  expireSeconds: z.number().int().min(60).max(86400),
});

const agoraRouter = createTRPCRouter({
  // quick sanity endpoint the app can poll to ensure envs are wired
  env: publicProcedure.query(async () => {
    return envSummary();
  }),

  // Cloud Recording lifecycle (optional if you’re not recording yet)
  acquire: publicProcedure.input(createResourceInput).mutation(async ({ input }) => {
    try {
      return await createResource(input);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message ?? "Failed to acquire recording resource",
      });
    }
  }),

  start: publicProcedure.input(startRecordingInput).mutation(async ({ input }) => {
    try {
      return await startRecording(input);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message ?? "Failed to start recording",
      });
    }
  }),

  stop: publicProcedure.input(stopRecordingInput).mutation(async ({ input }) => {
    try {
      return await stopRecording(input);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message ?? "Failed to stop recording",
      });
    }
  }),

  query: publicProcedure.input(queryRecordingInput).query(async ({ input }) => {
    try {
      return await queryRecording(input);
    } catch (err: any) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message ?? "Failed to query recording status",
      });
    }
  }),

  // Mint 007 (AccessToken2) RTC tokens — protected via server header
  rtcMint: publicProcedure.input(mintRTCInput).mutation(async ({ input, ctx }) => {
    try {
      // headers are case-insensitive, but normalize to be safe
      const h = ctx.req.headers;
      const headerKey =
        h.get("X-AGORA-MINT-KEY") ??
        h.get("x-agora-mint-key") ??
        h.get("x-Agora-Mint-Key");

      const secret = process.env.MINT_RTC_TOKEN_SECRET ?? "";
      if (!secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server misconfigured: MINT_RTC_TOKEN_SECRET not set",
        });
      }
      if (!headerKey || headerKey !== secret) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Unauthorized" });
      }

      const appId = process.env.AGORA_APP_ID ?? "";
      const appCertificate = process.env.AGORA_APP_CERTIFICATE ?? "";
      if (!appId || !appCertificate) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Server misconfigured: missing AGORA_APP_ID or AGORA_APP_CERTIFICATE",
        });
      }

      const { token, expireAt } = buildRtc007Token({
        appId,
        appCertificate,
        channelName: input.channelName,
        uid: input.uid,
        role: input.role, // publisher => join+pub, subscriber => join
        expireSeconds: input.expireSeconds,
      });

      return { token, expireAt };
    } catch (err: any) {
      if (err instanceof TRPCError) throw err;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err?.message ?? "Failed to mint RTC token",
      });
    }
  }),
});

export default agoraRouter;
