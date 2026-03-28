import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { getSupabaseEnv } from "@/lib/env";

export default function TestEnvSetup() {
  const [envData, setEnvData] = React.useState<{
    url?: string;
    key?: string;
    error?: string;
  }>({});

  React.useEffect(() => {
    try {
      const { url, key } = getSupabaseEnv();
      setEnvData({ url, key: key.substring(0, 20) + "..." });
    } catch (error) {
      setEnvData({ error: String(error) });
    }
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>Environment Setup Test</Text>

        {envData.error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>❌ Error</Text>
            <Text style={styles.errorDetails}>{envData.error}</Text>
          </View>
        ) : (
          <View style={styles.successBox}>
            <Text style={styles.successText}>✅ Environment Loaded</Text>
            <Text style={styles.label}>URL:</Text>
            <Text style={styles.value}>{envData.url}</Text>
            <Text style={styles.label}>Key (truncated):</Text>
            <Text style={styles.value}>{envData.key}</Text>
          </View>
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>🔍 Diagnostics</Text>
          <Text style={styles.infoText}>
            process.env.EXPO_PUBLIC_SUPABASE_URL:{" "}
            {process.env.EXPO_PUBLIC_SUPABASE_URL ? "✅" : "❌"}
          </Text>
          <Text style={styles.infoText}>
            process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY:{" "}
            {process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "✅" : "❌"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  section: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  errorBox: {
    backgroundColor: "#fee",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fcc",
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#c00",
    marginBottom: 10,
  },
  errorDetails: {
    fontSize: 14,
    color: "#900",
  },
  successBox: {
    backgroundColor: "#efe",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cfc",
    marginBottom: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#060",
    marginBottom: 15,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginTop: 10,
    marginBottom: 5,
  },
  value: {
    fontSize: 14,
    color: "#333",
    fontFamily: "monospace",
  },
  infoBox: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
});
