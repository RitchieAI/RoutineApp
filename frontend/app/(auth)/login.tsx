import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { login, googleLogin, guestLogin } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/today');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await googleLogin();
      // On native, the flow completes here; on web, the page redirects
      router.replace('/today');
    } catch (e: any) {
      setError(e.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError('');
    setGuestLoading(true);
    try {
      await guestLogin();
      router.replace('/today');
    } catch (e: any) {
      setError(e.message || 'Guest login failed');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={[styles.appName, { color: colors.primary }]}>routinely</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('welcomeBack')}</Text>
        </View>

        {error ? (
          <View testID="login-error" style={[styles.errorBox, { backgroundColor: `${colors.error}15` }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Mail size={20} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              testID="login-email-input"
              style={[styles.input, { color: colors.text }]}
              placeholder={t('email')}
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Lock size={20} color={colors.textMuted} strokeWidth={2} />
            <TextInput
              testID="login-password-input"
              style={[styles.input, { color: colors.text }]}
              placeholder={t('password')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoComplete="password"
            />
            <TouchableOpacity testID="toggle-password-visibility" onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? (
                <EyeOff size={20} color={colors.textMuted} strokeWidth={2} />
              ) : (
                <Eye size={20} color={colors.textMuted} strokeWidth={2} />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity testID="forgot-password-link" onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotText, { color: colors.primary }]}>{t('forgotPassword')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="login-submit-button"
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>{t('login')}</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Google Login Button */}
          <TouchableOpacity
            testID="google-login-button"
            style={[styles.googleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            activeOpacity={0.7}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIconG}>G</Text>
                </View>
                <Text style={[styles.googleBtnText, { color: colors.text }]}>{t('loginWithGoogle')}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Guest Login Button */}
          <TouchableOpacity
            testID="guest-login-button"
            style={[styles.guestBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleGuestLogin}
            disabled={guestLoading}
            activeOpacity={0.7}
          >
            {guestLoading ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={[styles.guestBtnText, { color: colors.text }]}>{t('guestLogin')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{t('noAccount')} </Text>
          <TouchableOpacity testID="go-to-register" onPress={() => router.push('/(auth)/register')}>
            <Text style={[styles.footerLink, { color: colors.primary }]}>{t('register')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  headerSection: { marginBottom: 40 },
  appName: { fontSize: 16, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '500' },
  form: { gap: 14 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },
  forgotText: { fontSize: 14, fontWeight: '600', textAlign: 'right', marginTop: 4 },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { paddingHorizontal: 16, fontSize: 13, fontWeight: '600' },
  googleBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 12,
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconG: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  googleBtnText: { fontSize: 16, fontWeight: '600' },
  guestBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  guestBtnText: { fontSize: 16, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '700' },
});
