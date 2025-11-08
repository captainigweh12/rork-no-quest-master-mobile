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
  retryTokenFetch: () => void;
}

export const [VideoSDKContextProvider, useVideoSDK] =
  createContextHook<VideoSDKContextType>(() => {
    const [meetingId, setMeetingIdState] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [shouldFetch, setShouldFetch] = useState(false);

    // Use tRPC React Query hooks with LAZY initialization
    // Only fetch token when user actually needs to start/join a stream
    const tokenQuery = trpc.videosdk.getToken.useQuery(undefined, {
      enabled: shouldFetch, // Only fetch when explicitly requested  
      staleTime: 1000 * 60 * 60, // 1 hour
      retry: (failureCount, error) => {
        // Retry up to 3 times with exponential backoff
        if (failureCount >= 3) return false;
        
        // Don't retry on certain errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("404") || errorMessage.includes("Not Found")) {
          console.log("[VideoSDK Context] Not retrying - route not found");
          return false;
        }
        
        console.log(`[VideoSDK Context] Retry attempt ${failureCount + 1}/3`);
        return true;
      },
      retryDelay: (attemptIndex) => {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * Math.pow(2, attemptIndex), 4000);
        console.log(`[VideoSDK Context] Retrying in ${delay}ms...`);
        return delay;
      },
    });

    // Handle token query errors via useEffect
    useEffect(() => {
      if (tokenQuery.error) {
        console.error("[VideoSDK Context] Token fetch error:", tokenQuery.error);
        
        // Extract detailed error information
        const error = tokenQuery.error;
        let message = error instanceof Error ? error.message : String(error);
        
        console.error("[VideoSDK Context] Error message:", message);
        console.error("[VideoSDK Context] Error type:", error?.constructor?.name);
        
        // Provide more helpful error messages based on error type
        let userMessage = "Failed to fetch authentication token";
        
        if (message.includes("JSON Parse error") || message.includes("Unexpected character")) {
          userMessage = "Server returned invalid response (HTML instead of JSON). The VideoSDK route may not be properly configured on the backend.";
          console.error("[VideoSDK Context] 🔍 Likely cause: Backend route /api/trpc/videosdk.getToken is not accessible or returning HTML");
        } else if (message.includes("404") || message.includes("Not Found")) {
          userMessage = "API route not found (404). The VideoSDK endpoint may not be registered on the backend.";
          console.error("[VideoSDK Context] 🔍 Check: Backend should have videosdk router registered in app-router.ts");
        } else if (message.includes("Failed to fetch") || message.includes("Network request failed")) {
          userMessage = "Network error. Please check your internet connection and ensure the backend is running.";
          console.error("[VideoSDK Context] 🔍 Check: Backend URL and network connectivity");
        } else if (message.includes("CORS")) {
          userMessage = "CORS error. The backend may not be configured to accept requests from this origin.";
          console.error("[VideoSDK Context] 🔍 Check: Backend CORS configuration in hono.ts");
        } else if (message.includes("timeout") || message.includes("timed out")) {
          userMessage = "Request timed out. The backend may be slow or unresponsive.";
          console.error("[VideoSDK Context] 🔍 Check: Backend performance and cold start times");
        }
        
        setError(userMessage);
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
      
      // Enable fetching if not already enabled
      if (!shouldFetch) {
        console.log("[VideoSDK Context] Enabling token fetch...");
        setShouldFetch(true);
      }
      
      if (!tokenQuery.data?.token) {
        console.log("[VideoSDK Context] No token available yet, waiting for query...");
        return;
      }

      console.log("[VideoSDK Context] Creating meeting with token...");
      await createMeetingMutation.mutateAsync({ token: tokenQuery.data.token });
    }, [shouldFetch, tokenQuery.data?.token, createMeetingMutation]);

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


    const retryTokenFetch = useCallback(() => {
      console.log("[VideoSDK Context] Manual retry requested");
      setError(null);
      setShouldFetch(true); // Enable fetching
      tokenQuery.refetch();
    }, [tokenQuery]);

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
        retryTokenFetch,
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
        retryTokenFetch,
      ]
    );
  });
