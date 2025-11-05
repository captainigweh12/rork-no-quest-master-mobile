import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { trpc } from "@/lib/trpc";

interface VideoSDKContextType {
  token: string | null;
  meetingId: string | null;
  isLoadingToken: boolean;
  isCreatingMeeting: boolean;
  error: string | null;
  createNewMeeting: () => Promise<void>;
  setMeetingId: (id: string) => void;
  clearMeeting: () => void;
}

export const [VideoSDKContextProvider, useVideoSDK] =
  createContextHook<VideoSDKContextType>(() => {
    const [meetingId, setMeetingIdState] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Use tRPC React Query hooks instead of direct client calls
    const tokenQuery = trpc.videosdk.getToken.useQuery(undefined, {
      staleTime: 1000 * 60 * 60,
      retry: 2,
    });

    // Handle token query errors via useEffect
    useEffect(() => {
      if (tokenQuery.error) {
        console.error("[VideoSDK Context] Token fetch error:", tokenQuery.error);
        const message = tokenQuery.error instanceof Error ? tokenQuery.error.message : String(tokenQuery.error);
        console.error("[VideoSDK Context] Error message:", message);
        setError(
          message.includes("404")
            ? "API route not found (404). Check Base URL and that /api/trpc/videosdk.getToken exists."
            : "Failed to fetch authentication token"
        );
      } else if (tokenQuery.data) {
        console.log("[VideoSDK Context] Token fetched successfully:", tokenQuery.data);
        setError(null);
      }
    }, [tokenQuery.error, tokenQuery.data]);

    const createMeetingMutation = trpc.videosdk.createMeeting.useMutation({
      onSuccess: (data) => {
        console.log("[VideoSDK Context] Meeting created:", data.meetingId);
        setMeetingIdState(data.meetingId);
        setError(null);
      },
      onError: (err) => {
        console.error("[VideoSDK Context] Error creating meeting:", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(
          message.includes("404")
            ? "Create meeting route not found (404). Verify backend Videosdk router and tRPC base URL."
            : message || "Failed to create meeting"
        );
      },
    });

    const createNewMeeting = useCallback(async () => {
      console.log("[VideoSDK Context] createNewMeeting called");
      if (!tokenQuery.data?.token) {
        console.log("[VideoSDK Context] No token available yet, waiting for query...");
        return;
      }

      console.log("[VideoSDK Context] Creating meeting with token...");
      await createMeetingMutation.mutateAsync({ token: tokenQuery.data.token });
    }, [tokenQuery.data?.token, createMeetingMutation]);

    const setMeetingId = useCallback((id: string) => {
      console.log("[VideoSDK Context] Setting meeting ID manually:", id);
      setMeetingIdState(id);
      setError(null);
    }, []);

    const clearMeeting = useCallback(() => {
      console.log("[VideoSDK Context] Clearing meeting");
      setMeetingIdState(null);
      setError(null);
    }, []);


    return useMemo(
      () => ({
        token: tokenQuery.data?.token ?? null,
        meetingId,
        isLoadingToken: tokenQuery.isLoading,
        isCreatingMeeting: createMeetingMutation.isPending,
        error,
        createNewMeeting,
        setMeetingId,
        clearMeeting,
      }),
      [
        tokenQuery.data?.token,
        meetingId,
        tokenQuery.isLoading,
        createMeetingMutation.isPending,
        error,
        createNewMeeting,
        setMeetingId,
        clearMeeting,
      ]
    );
  });
