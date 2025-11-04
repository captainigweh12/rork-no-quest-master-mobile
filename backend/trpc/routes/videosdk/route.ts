import { z } from "zod";
import jwt from "jsonwebtoken";
import { publicProcedure, createTRPCRouter } from "../../create-context";

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
};

// Helper: Generate a signed VideoSDK token
function generateVideoSDKToken({
  permissions = ["allow_join", "allow_mod"],
  expiresInMinutes = 60,
}: {
  permissions?: string[];
  expiresInMinutes?: number;
}) {
  const API_KEY = requireEnv("VIDEOSDK_API_KEY");
  const SECRET_KEY = requireEnv("VIDEOSDK_SECRET_KEY");

  const payload = {
    apikey: API_KEY,
    permissions,
    version: 2,
  };

  const token = jwt.sign(payload, SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: `${expiresInMinutes}m`,
  });

  return token;
}

// Helper: Create a new meeting
async function createVideoSDKMeeting(token: string): Promise<string> {
  const response = await fetch("https://api.videosdk.live/v2/rooms", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to create meeting: ${response.status} ${text}`);
  }

  const data = await response.json();
  return data.roomId || data.meetingId;
}

// Helper: Validate an existing meeting
async function validateVideoSDKMeeting(token: string, meetingId: string): Promise<boolean> {
  const response = await fetch(`https://api.videosdk.live/v2/rooms/${meetingId}`, {
    method: "GET",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
  });
  return response.ok;
}

// === tRPC Router ===
export default createTRPCRouter({
  // Generate a VideoSDK token
  getToken: publicProcedure.query(() => {
    try {
      const token = generateVideoSDKToken({});
      return { token };
    } catch (error) {
      throw new Error("Failed to generate VideoSDK token");
    }
  }),

  // Create a meeting
  createMeeting: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const meetingId = await createVideoSDKMeeting(input.token);
        return { meetingId };
      } catch (error) {
        throw new Error("Failed to create meeting");
      }
    }),

  // Validate a meeting
  validateMeeting: publicProcedure
    .input(z.object({ token: z.string(), meetingId: z.string() }))
    .query(async ({ input }) => {
      try {
        const isValid = await validateVideoSDKMeeting(input.token, input.meetingId);
        return { isValid };
      } catch (error) {
        return { isValid: false };
      }
    }),

  // Check environment configuration
  checkConfig: publicProcedure.query(() => {
    const apiKeyPresent = !!process.env.VIDEOSDK_API_KEY;
    const secretKeyPresent = !!process.env.VIDEOSDK_SECRET_KEY;

    return {
      apiKeyPresent,
      secretKeyPresent,
      configured: apiKeyPresent && secretKeyPresent,
    };
  }),
});
