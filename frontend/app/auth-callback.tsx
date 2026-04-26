import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function AuthCallbackScreen() {
  const { processGoogleSession } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use ref to prevent double processing (React StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      try {
        let sessionId: string | null = null;

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          // Extract session_id from URL hash fragment
          const hash = window.location.hash;
          if (hash && hash.includes('session_id=')) {
            const params = new URLSearchParams(hash.substring(1));
            sessionId = params.get('session_id');
          }
        }

        if (sessionId) {
          await processGoogleSession(sessionId);
          // Clear the hash from URL
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.history.replaceState(null, '', window.location.pathname);
          }
          // Small delay to ensure router is ready
          setTimeout(() => router.replace('/today'), 100);
        } else {
          // Small delay to ensure router is ready
          setTimeout(() => router.replace('/(auth)/login'), 100);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        // Small delay to ensure router is ready
        setTimeout(() => router.replace('/(auth)/login'), 100);
      }
    };

    handleCallback();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ActivityIndicator testID="auth-callback-loading" size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textMuted }]}>Signing in...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  text: {
    fontSize: 15,
    fontWeight: '500',
  },
});
