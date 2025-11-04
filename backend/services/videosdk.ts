import jwt from "jsonwebtoken";

const VIDEOSDK_API_KEY = process.env.VIDEOSDK_API_KEY;
const VIDEOSDK_SECRET_KEY = process.env.VIDEOSDK_SECRET_KEY;

export function generateVideoSDKToken(options: {
  permissions?: string[];
  apiKey?: string;
  expiresIn?: string;
}): string {
  if (!VIDEOSDK_API_KEY || !VIDEOSDK_SECRET_KEY) {
    throw new Error("VideoSDK credentials not configured");
  }

  const payload = {
    apikey: options.apiKey || VIDEOSDK_API_KEY,
    permissions: options.permissions || ["allow_join", "allow_mod"],
    version: 2,
    roles: ["CRAWLER"],
  };

  const token = jwt.sign(payload, VIDEOSDK_SECRET_KEY, {
    algorithm: "HS256",
    expiresIn: options.expiresIn || "24h",
  });

  return token;
}

export async function createVideoSDKMeeting(token: string): Promise<string> {
  const VIDEOSDK_API_ENDPOINT = "https://api.videosdk.live/v2/rooms";

  const response = await fetch(VIDEOSDK_API_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create meeting: ${errorText}`);
  }

  const data = await response.json();
  return data.roomId;
}

export async function validateVideoSDKMeeting(
  token: string,
  meetingId: string
): Promise<boolean> {
  const VIDEOSDK_API_ENDPOINT = `https://api.videosdk.live/v2/rooms/validate/${meetingId}`;

  const response = await fetch(VIDEOSDK_API_ENDPOINT, {
    method: "GET",
    headers: {
      authorization: token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    return false;
  }

  const data = await response.json();
  return data.roomId === meetingId;
}
