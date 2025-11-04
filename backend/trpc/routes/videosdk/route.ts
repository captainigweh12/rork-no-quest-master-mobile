import { z } from "zod";
import { publicProcedure, createTRPCRouter } from "../../create-context";
import {
  generateVideoSDKToken,
  createVideoSDKMeeting,
  validateVideoSDKMeeting,
} from "../../../services/videosdk";

export default createTRPCRouter({
  getToken: publicProcedure.query(() => {
    console.log("[VideoSDK] Generating token");
    const token = generateVideoSDKToken({
      permissions: ["allow_join", "allow_mod"],
    });
    console.log("[VideoSDK] Token generated successfully");
    return { token };
  }),

  createMeeting: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      console.log("[VideoSDK] Creating meeting");
      try {
        const meetingId = await createVideoSDKMeeting(input.token);
        console.log("[VideoSDK] Meeting created:", meetingId);
        return { meetingId };
      } catch (error) {
        console.error("[VideoSDK] Error creating meeting:", error);
        throw new Error(
          `Failed to create meeting: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),

  validateMeeting: publicProcedure
    .input(z.object({ token: z.string(), meetingId: z.string() }))
    .query(async ({ input }) => {
      console.log("[VideoSDK] Validating meeting:", input.meetingId);
      try {
        const isValid = await validateVideoSDKMeeting(
          input.token,
          input.meetingId
        );
        console.log("[VideoSDK] Meeting validation result:", isValid);
        return { isValid };
      } catch (error) {
        console.error("[VideoSDK] Error validating meeting:", error);
        return { isValid: false };
      }
    }),

  checkConfig: publicProcedure.query(() => {
    const apiKeyPresent = !!process.env.VIDEOSDK_API_KEY;
    const secretKeyPresent = !!process.env.VIDEOSDK_SECRET_KEY;

    console.log("[VideoSDK] Config check:");
    console.log("  API Key present:", apiKeyPresent);
    console.log("  Secret Key present:", secretKeyPresent);

    return {
      apiKeyPresent,
      secretKeyPresent,
      configured: apiKeyPresent && secretKeyPresent,
    };
  }),
});
