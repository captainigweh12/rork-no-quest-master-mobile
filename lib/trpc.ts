import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

function computeBaseUrl(): string {
  const envBase = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (envBase && envBase.trim().length > 0) return envBase;

  if (Platform.OS === "web") {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
  }

  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    const isSecure = host.includes(".app") || host.includes(".ngrok-free.app") || host.includes(".ngrok.io");
    return `${isSecure ? "https" : "http"}://${host}`;
  }

  console.warn("[trpc] Missing EXPO_PUBLIC_RORK_API_BASE_URL and cannot infer host. Defaulting to http://localhost:8081");
  return "http://localhost:8081";
}

const baseUrl = computeBaseUrl();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
