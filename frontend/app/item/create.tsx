import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/utils/api';
import { PRIORITY_OPTIONS } from '../../src/utils/constants';
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react-native';

export default function CreateItemScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { routineId, itemId } = useLocalSearchParams<{ routineId: string; itemId?: string }>();
  const insets = useSafeAreaInsets();
  const isEdit = !!itemId;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('medium');
  const [hasSpecificTime, setHasSpecificTime] = useState(false);
  const [time, setTime] = useState('');
  const [repeatCount, setRepeatCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEdit);

  useEffect(() => {
    if (isEdit && itemId) {
      api(`/api/routines/${routineId}/items`).then((items) => {
        const item = items.find((i: any) => i.id === itemId);
        if (item) {
          setTitle(item.title);
          setNotes(item.notes || '');
          setPriority(item.priority);
          setHasSpecificTime(item.has_specific_time);
          setTime(item.time || '');
          setRepeatCount(item.repeat_per_day_count);
        }
        setFetching(false);
      }).catch(() => setFetching(false));
    }
  }, [itemId, routineId, isEdit]);

  const handleSave = async () => {
    if (!title.trim()) return;
    setLoading(true);

    const body = {
      title: title.trim(),
      notes: notes.trim(),
      priority,
      has_specific_time: hasSpecificTime,
      time: hasSpecificTime ? time : '',
      is_all_day: !hasSpecificTime,
      order_index: 0,
      repeat_per_day_count: repeatCount,
    };

    try {
      if (isEdit) {
        await api(`/api/items/${itemId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await api(`/api/routines/${routineId}/items`, { method: 'POST', body: JSON.stringify(body) });
      }
      router.back();
    } catch (e: any) {
      console.error('Error saving item:', e);
    } finally {
      setLoading(false);
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return colors.error;
    if (p === 'medium') return '#F59E0B';
    return colors.success;
  };

  if (fetching) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          {isEdit ? t('editItem') : t('addItem')}
        </Text>
        <TouchableOpacity
          testID="save-item-button"
          onPress={handleSave}
          disabled={loading || !title.trim()}
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: title.trim() ? 1 : 0.5 }]}
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
        {/* Title */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('taskTitle')}</Text>
        <TextInput
          testID="item-title-input"
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder={t('taskTitle')}
          placeholderTextColor={colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        {/* Notes */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('notes')}</Text>
        <TextInput
          testID="item-notes-input"
          style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder={t('notes')}
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Priority */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('priority')}</Text>
        <View style={styles.priorityRow}>
          {PRIORITY_OPTIONS.map((p) => (
            <TouchableOpacity
              testID={`priority-${p}`}
              key={p}
              style={[
                styles.priorityBtn,
                {
                  backgroundColor: priority === p ? priorityColor(p) + '20' : colors.surfaceElevated,
                  borderColor: priority === p ? priorityColor(p) : colors.border,
                },
              ]}
              onPress={() => setPriority(p)}
            >
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(p) }]} />
              <Text
                style={[
                  styles.priorityBtnText,
                  { color: priority === p ? priorityColor(p) : colors.textMuted },
                ]}
              >
                {t(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Repeat Count */}
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('repeatCount')}</Text>
        <View style={[styles.counterRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity
            testID="decrease-repeat"
            onPress={() => setRepeatCount(Math.max(1, repeatCount - 1))}
            style={[styles.counterBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <Minus size={18} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[styles.counterValue, { color: colors.text }]}>{repeatCount}</Text>
          <TouchableOpacity
            testID="increase-repeat"
            onPress={() => setRepeatCount(Math.min(10, repeatCount + 1))}
            style={[styles.counterBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <Plus size={18} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Time */}
        <View style={[styles.timeToggleRow, { borderColor: colors.border }]}>
          <Text style={[styles.timeLabel, { color: colors.text }]}>{t('time')}</Text>
          <Switch
            testID="time-toggle"
            value={hasSpecificTime}
            onValueChange={setHasSpecificTime}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.white}
          />
        </View>

        {hasSpecificTime && (
          <TextInput
            testID="item-time-input"
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="08:00"
            placeholderTextColor={colors.textMuted}
            value={time}
            onChangeText={setTime}
            keyboardType="numbers-and-punctuation"
          />
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
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  priorityBtnText: { fontSize: 14, fontWeight: '600' },
  counterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, borderWidth: 1, borderRadius: 14, paddingVertical: 12,
  },
  counterBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  counterValue: { fontSize: 24, fontWeight: '800', minWidth: 40, textAlign: 'center' },
  timeToggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, marginTop: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  timeLabel: { fontSize: 16, fontWeight: '600' },
});
