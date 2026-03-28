import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.log('[ErrorBoundary] getDerivedStateFromError', error?.message);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.log('[ErrorBoundary] componentDidCatch', error?.message, info?.componentStack);
  }

  handleReset = () => {
    console.log('[ErrorBoundary] reset');
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="tabs-error-fallback">
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle} numberOfLines={2}>
            {this.state.error?.message ?? 'Unknown error'}
          </Text>
          <Pressable onPress={this.handleReset} style={styles.button} accessibilityRole="button">
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 18, fontWeight: '800' as const },
  subtitle: { fontSize: 13, opacity: 0.7, textAlign: 'center' },
  button: { marginTop: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#0EA5E9' },
  buttonText: { color: '#fff', fontWeight: '800' as const },
});
