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
  const { login } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/today');
    } catch (e: any) {
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
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
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 32 },
  footerText: { fontSize: 15 },
  footerLink: { fontSize: 15, fontWeight: '700' },
});
