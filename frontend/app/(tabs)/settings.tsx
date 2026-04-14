import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import {
  requestNotificationPermission,
  registerPushToken,
  scheduleLocalReminders,
  cancelAllNotifications,
  PRESET_REMINDER_TIMES,
} from '../../src/utils/notifications';
import {
  Sun, Moon, Monitor, Globe, Bell, LogOut, Clock, Plus, X,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { colors, mode, setMode } = useTheme();
  const { language, t, setLanguage } = useLanguage();
  const { user, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  // Load settings on focus
  useFocusEffect(
    useCallback(() => {
      api('/api/settings').then((data) => {
        setNotificationsEnabled(data.notifications_enabled);
        setReminderTimes(data.reminder_times || []);
      }).catch(() => {});
    }, [])
  );

  const handleThemeChange = (newMode: 'light' | 'dark' | 'system') => {
    setMode(newMode);
    api('/api/settings', { method: 'PUT', body: JSON.stringify({ theme_mode: newMode }) }).catch(() => {});
  };

  const handleLanguageChange = (lang: 'en' | 'de') => {
    setLanguage(lang);
    api('/api/settings', { method: 'PUT', body: JSON.stringify({ language: lang }) }).catch(() => {});
  };

  const handleNotificationToggle = async (value: boolean) => {
    if (value) {
      // Request permission first
      const granted = await requestNotificationPermission();
      setPermissionGranted(granted);

      if (!granted) {
        Alert.alert(
          t('notifications'),
          language === 'de'
            ? 'Bitte erlaube Benachrichtigungen in den Geräteeinstellungen.'
            : 'Please enable notifications in your device settings.',
        );
        return;
      }

      // Register push token
      await registerPushToken();

      // Set default reminder if none configured
      const times = reminderTimes.length > 0 ? reminderTimes : ['09:00'];
      if (reminderTimes.length === 0) {
        setReminderTimes(times);
      }

      // Schedule local notifications
      await scheduleLocalReminders(times, language);

      setNotificationsEnabled(true);
      api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ notifications_enabled: true, reminder_times: times }),
      }).catch(() => {});
    } else {
      // Cancel all notifications
      await cancelAllNotifications();
      setNotificationsEnabled(false);
      api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ notifications_enabled: false }),
      }).catch(() => {});
    }
  };

  const toggleReminderTime = async (time: string) => {
    let newTimes: string[];
    if (reminderTimes.includes(time)) {
      newTimes = reminderTimes.filter((t) => t !== time);
    } else {
      newTimes = [...reminderTimes, time].sort();
    }
    setReminderTimes(newTimes);

    // Reschedule notifications
    if (notificationsEnabled) {
      await scheduleLocalReminders(newTimes, language);
    }

    // Save to backend
    api('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({ reminder_times: newTimes }),
    }).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert(t('logout'), t('areYouSure'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('logout'),
        style: 'destructive',
        onPress: async () => {
          await cancelAllNotifications();
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
                <Text style={[styles.themeBtnText, { color: mode === key ? colors.white : colors.textMuted }]}>
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
                <Text style={[styles.langBtnText, { color: language === lang ? colors.white : colors.textMuted }]}>
                  {lang === 'en' ? 'English' : 'Deutsch'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{t('notifications')}</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Main toggle */}
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

          {/* Reminder Times (only shown when enabled) */}
          {notificationsEnabled && (
            <View style={styles.reminderSection}>
              <View style={styles.reminderHeader}>
                <Clock size={16} color={colors.textMuted} strokeWidth={2} />
                <Text style={[styles.reminderLabel, { color: colors.textMuted }]}>{t('reminderTimes')}</Text>
              </View>

              {/* Active reminders */}
              {reminderTimes.length > 0 && (
                <View style={styles.activeTimesRow}>
                  {reminderTimes.map((time) => (
                    <View
                      testID={`active-reminder-${time}`}
                      key={time}
                      style={[styles.activeTimeChip, { backgroundColor: colors.primary }]}
                    >
                      <Text style={styles.activeTimeText}>{time}</Text>
                      <TouchableOpacity
                        testID={`remove-reminder-${time}`}
                        onPress={() => toggleReminderTime(time)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={14} color={colors.white} strokeWidth={2.5} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Preset time options */}
              <TouchableOpacity
                testID="show-time-picker"
                onPress={() => setShowTimePicker(!showTimePicker)}
                style={[styles.addReminderBtn, { borderColor: colors.border }]}
                activeOpacity={0.7}
              >
                <Plus size={16} color={colors.primary} strokeWidth={2.5} />
                <Text style={[styles.addReminderText, { color: colors.primary }]}>
                  {showTimePicker ? t('cancel') : t('addReminder')}
                </Text>
              </TouchableOpacity>

              {showTimePicker && (
                <View style={styles.presetGrid}>
                  {PRESET_REMINDER_TIMES.map((time) => {
                    const isActive = reminderTimes.includes(time);
                    return (
                      <TouchableOpacity
                        testID={`preset-time-${time}`}
                        key={time}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isActive ? colors.primary : colors.surfaceElevated,
                            borderColor: isActive ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          toggleReminderTime(time);
                        }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            { color: isActive ? colors.white : colors.text },
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.reminderHint, { color: colors.textMuted }]}>
                {language === 'de'
                  ? 'Du wirst erinnert, wenn du noch offene Aufgaben hast.'
                  : "You'll be reminded if you have open tasks."}
              </Text>
            </View>
          )}
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

        <Text style={[styles.version, { color: colors.textMuted }]}>{t('version')} 1.0.0</Text>
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
    fontSize: 12, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 1.2, marginTop: 24, marginBottom: 8, marginLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileEmail: { fontSize: 13, marginTop: 2 },
  themeRow: { flexDirection: 'row', gap: 8 },
  themeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  themeBtnText: { fontSize: 13, fontWeight: '600' },
  langRow: { flexDirection: 'row', gap: 8 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  langBtnText: { fontSize: 14, fontWeight: '600' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingLabel: { fontSize: 16, fontWeight: '500' },
  reminderSection: { marginTop: 16, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  reminderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  reminderLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  activeTimesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  activeTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
  },
  activeTimeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addReminderBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
  },
  addReminderText: { fontSize: 14, fontWeight: '600' },
  presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  presetChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  presetChipText: { fontSize: 14, fontWeight: '600' },
  reminderHint: { fontSize: 12, marginTop: 12, lineHeight: 18 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16,
  },
  logoutText: { fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 24 },
});
