import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/utils/api';
import { IconPicker } from '../../src/components/IconPicker';
import { ROUTINE_COLORS, DAYS_OF_WEEK } from '../../src/utils/constants';
import { ArrowLeft, Check } from 'lucide-react-native';

export default function CreateRoutineScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('list');
  const [color, setColor] = useState('#0047FF');
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [weeklyDays, setWeeklyDays] = useState<string[]>([
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  ]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit) {
      api(`/api/routines/${id}`).then((data) => {
        setName(data.name);
        setDescription(data.description || '');
        setIcon(data.icon);
        setColor(data.color);
        setRecurrenceType(data.recurrence_type);
        if (data.recurrence_config?.days) {
          setWeeklyDays(data.recurrence_config.days);
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [id, isEdit]);

  const toggleWeeklyDay = (day: string) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);

    const recurrenceConfig = recurrenceType === 'weekly' ? { days: weeklyDays } : {};
    const body = { name: name.trim(), description: description.trim(), icon, color, recurrence_type: recurrenceType, recurrence_config: recurrenceConfig };

    try {
      if (isEdit) {
        await api(`/api/routines/${id}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api('/api/routines', { method: 'POST', body: JSON.stringify(body) });
      }
      router.back();
    } catch (e: any) {
      console.error('Error saving routine:', e);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const recurrenceOptions = ['daily', 'weekly'] as const;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: colors.bg }]}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          {isEdit ? t('editRoutine') : t('createRoutine')}
        </Text>
        <TouchableOpacity
          testID="save-routine-button"
          onPress={handleSave}
          disabled={loading || !name.trim()}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: name.trim() ? 1 : 0.5 }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Check size={20} color={colors.white} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Name */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('routineName')}</Text>
        <TextInput
          testID="routine-name-input"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder={t('routineName')}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        {/* Description */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('description')}</Text>
        <TextInput
          testID="routine-description-input"
          style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder={t('description')}
          placeholderTextColor={colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Icon */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('icon')}</Text>
        <IconPicker selected={icon} onSelect={setIcon} accentColor={color} />

        {/* Color */}
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>{t('color')}</Text>
        <View style={styles.colorRow}>
          {ROUTINE_COLORS.map((c) => (
            <TouchableOpacity
              testID={`color-option-${c}`}
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorBtn,
                { backgroundColor: c, borderColor: color === c ? colors.text : 'transparent' },
              ]}
            >
              {color === c && <Check size={16} color="#fff" strokeWidth={3} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Recurrence */}
        <Text style={[styles.label, { color: colors.textMuted, marginTop: 20 }]}>{t('recurrence')}</Text>
        <View style={styles.recurrenceRow}>
          {recurrenceOptions.map((opt) => (
            <TouchableOpacity
              testID={`recurrence-${opt}`}
              key={opt}
              style={[
                styles.recurrenceBtn,
                {
                  backgroundColor: recurrenceType === opt ? colors.primary : colors.surfaceElevated,
                  borderColor: recurrenceType === opt ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setRecurrenceType(opt)}
            >
              <Text
                style={[
                  styles.recurrenceBtnText,
                  { color: recurrenceType === opt ? colors.white : colors.textMuted },
                ]}
              >
                {t(opt)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly days */}
        {recurrenceType === 'weekly' && (
          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((day) => (
              <TouchableOpacity
                testID={`day-${day}`}
                key={day}
                style={[
                  styles.dayBtn,
                  {
                    backgroundColor: weeklyDays.includes(day) ? color : colors.surfaceElevated,
                    borderColor: weeklyDays.includes(day) ? color : colors.border,
                  },
                ]}
                onPress={() => toggleWeeklyDay(day)}
              >
                <Text
                  style={[
                    styles.dayBtnText,
                    { color: weeklyDays.includes(day) ? '#fff' : colors.textMuted },
                  ]}
                >
                  {t(day)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  screenTitle: { fontSize: 18, fontWeight: '700' },
  saveBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  scrollContent: { paddingTop: 16 },
  label: {
    fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, marginTop: 16,
  },
  input: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16,
  },
  multiline: { minHeight: 80 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center',
  },
  recurrenceRow: { flexDirection: 'row', gap: 8 },
  recurrenceBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
    alignItems: 'center',
  },
  recurrenceBtnText: { fontSize: 14, fontWeight: '600' },
  daysRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  dayBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1,
  },
  dayBtnText: { fontSize: 13, fontWeight: '600' },
});
