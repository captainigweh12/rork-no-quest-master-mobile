import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, getTrpcClient } from "@/lib/trpc";

const queryClient = new QueryClient();

export default function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] =
    useState<ReturnType<typeof trpc.createClient> | null>(null);

  useEffect(() => {
    let mounted = true;
    getTrpcClient().then((c) => {
      if (mounted) setClient(c);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!client) {
    return null;
  }

  return (
    <trpc.Provider client={client} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
