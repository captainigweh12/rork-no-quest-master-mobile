import { useState, useEffect, useCallback, useMemo } from "react";
import createContextHook from "@nkzw/create-context-hook";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpcClient } from "@/lib/trpc";

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

    const tokenQuery = useQuery({
      queryKey: ["videosdk-token"],
      queryFn: async () => {
        try {
          console.log("[VideoSDK Context] Fetching token");
          const result = await trpcClient.videosdk.getToken.query();
          console.log("[VideoSDK Context] Token fetched successfully:", result);
          return result;
        } catch (err) {
          console.error("[VideoSDK Context] Token fetch error:", err);
          const message = err instanceof Error ? err.message : String(err);
          console.error("[VideoSDK Context] Error message:", message);
          setError(
            message.includes("404")
              ? "API route not found (404). Check Base URL and that /api/trpc/videosdk.getToken exists."
              : "Failed to fetch authentication token"
          );
          throw err;
        }
      },
      staleTime: 1000 * 60 * 60,
      retry: 0,
    });

    const createMeetingMutation = useMutation({
      mutationFn: async (token: string) => {
        console.log("[VideoSDK Context] Creating meeting with token");
        const result = await trpcClient.videosdk.createMeeting.mutate({ token });
        console.log("[VideoSDK Context] Meeting created:", result.meetingId);
        return result;
      },
      onSuccess: (data) => {
        console.log("[VideoSDK Context] Setting meeting ID:", data.meetingId);
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
        console.log("[VideoSDK Context] No token available, fetching...");
        await tokenQuery.refetch();
        return;
      }

      console.log("[VideoSDK Context] Creating meeting...");
      await createMeetingMutation.mutateAsync(tokenQuery.data.token);
    }, [tokenQuery.data?.token, tokenQuery.refetch, createMeetingMutation.mutateAsync]);

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

    useEffect(() => {
      if (tokenQuery.error) {
        console.error("[VideoSDK Context] Token query error:", tokenQuery.error);
      }
    }, [tokenQuery.error]);

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
