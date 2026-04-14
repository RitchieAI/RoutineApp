import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import { Sun, Moon, Monitor, Globe, Bell, LogOut, ChevronRight } from 'lucide-react-native';

export default function SettingsScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleThemeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ theme_mode: newMode }),
    }).catch(() => {});
  };

  const handleLanguageChange = (lang: 'en' | 'de') => {
    setLanguage(lang);
    api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ language: lang }),
    }).catch(() => {});
  };

  const handleNotificationToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ notifications_enabled: value }),
    }).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('areYouSure'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const themeOptions: Array<{ key: 'light' | 'dark' | 'system'; icon: any; label: string }> = [
    { key: 'light', icon: Sun, label: t('lightMode') },
    { key: 'dark', icon: Moon, label: t('darkMode') },
    { key: 'system', icon: Monitor, label: t('systemMode') },
  ];

  return (
    <View testID="settings-screen" style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('settings')}</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Account */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('account')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarText}>{(user?.name || 'U')[0].toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.profileName, { color: colors.text }]}>{user?.name}</Text>
              <Text style={[styles.profileEmail, { color: colors.textMuted }]}>{user?.email}</Text>
            </View>
          </View>
        </View>

        {/* Theme */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('theme')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.themeRow}>
            {themeOptions.map(({ key, icon: Icon, label }) => (
              <TouchableOpacity
                testID={`theme-option-${key}`}
                key={key}
                style={[
                  styles.themeBtn,
                  {
                    backgroundColor: mode === key ? colors.primary : colors.surfaceElevated,
                    borderColor: mode === key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleThemeChange(key)}
                activeOpacity={0.7}
              >
                <Icon size={18} color={mode === key ? colors.white : colors.textMuted} strokeWidth={2} />
                <Text
                  style={[
                    styles.themeBtnText,
                    { color: mode === key ? colors.white : colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('language')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.langRow}>
            {(['en', 'de'] as const).map((lang) => (
              <TouchableOpacity
                testID={`language-option-${lang}`}
                key={lang}
                style={[
                  styles.langBtn,
                  {
                    backgroundColor: language === lang ? colors.primary : colors.surfaceElevated,
                    borderColor: language === lang ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => handleLanguageChange(lang)}
                activeOpacity={0.7}
              >
                <Globe size={16} color={language === lang ? colors.white : colors.textMuted} strokeWidth={2} />
                <Text
                  style={[
                    styles.langBtnText,
                    { color: language === lang ? colors.white : colors.textMuted },
                  ]}
                >
                  {lang === 'en' ? 'English' : 'Deutsch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('notifications')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.settingRow}>
            <View style={styles.settingRowLeft}>
              <Bell size={20} color={colors.text} strokeWidth={2} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>{t('notifications')}</Text>
            </View>
            <Switch
              testID="notifications-toggle"
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={{ marginTop: 16 }}>
          <TouchableOpacity
            testID="logout-button"
            style={[styles.logoutBtn, { backgroundColor: `${colors.error}12` }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <LogOut size={20} color={colors.error} strokeWidth={2} />
            <Text style={[styles.logoutText, { color: colors.error }]}>{t('logout')}</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: colors.textMuted }]}>
          {t('version')} 1.0.0
        </Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  langBtnText: { fontSize: 14, fontWeight: '600' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
