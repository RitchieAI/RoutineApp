import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/utils/api';
import { Mail, ArrowLeft } from 'lucide-react-native';

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          testID="back-to-login-button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>

        <View style={styles.headerSection}>
          <Text style={[styles.title, { color: colors.text }]}>{t('resetPassword')}</Text>
        </View>

        {sent ? (
          <View testID="reset-success" style={[styles.successBox, { backgroundColor: `${colors.success}15` }]}>
            <Text style={[styles.successText, { color: colors.success }]}>{t('resetEmailSent')}</Text>
          </View>
        ) : (
          <>
            {error ? (
              <View testID="forgot-error" style={[styles.errorBox, { backgroundColor: `${colors.error}15` }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Mail size={20} color={colors.textMuted} strokeWidth={2} />
                <TextInput
                  testID="forgot-email-input"
                  style={[styles.input, { color: colors.text }]}
                  placeholder={t('email')}
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                testID="send-reset-button"
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.7}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: colors.white }]}>{t('sendResetLink')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        <TouchableOpacity testID="back-to-login-link" onPress={() => router.push('/(auth)/login')} style={styles.backLink}>
          <Text style={[styles.backLinkText, { color: colors.primary }]}>{t('backToLogin')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backBtn: { padding: 8, marginBottom: 24, alignSelf: 'flex-start' },
  headerSection: { marginBottom: 32 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  errorBox: { padding: 14, borderRadius: 12, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '500' },
  successBox: { padding: 16, borderRadius: 12, marginBottom: 16 },
  successText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
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
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 17, fontWeight: '700' },
  backLink: { alignItems: 'center', marginTop: 32 },
  backLinkText: { fontSize: 15, fontWeight: '700' },
});
