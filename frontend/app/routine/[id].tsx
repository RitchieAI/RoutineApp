import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/utils/api';
import { StreakIndicator } from '../../src/components/StreakIndicator';
import { EmptyState } from '../../src/components/EmptyState';
import { getIconComponent } from '../../src/components/IconPicker';
import {
  ArrowLeft, Plus, Trash2, Edit3, ChevronRight,
} from 'lucide-react-native';

export default function RoutineDetailScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [routine, setRoutine] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [r, i] = await Promise.all([
        api(`/api/routines/${id}`),
        api(`/api/routines/${id}/items`),
      ]);
      setRoutine(r);
      setItems(i);
    } catch (e) {
      console.error('Error loading routine:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteRoutine = () => {
    Alert.alert(t('deleteRoutine'), t('areYouSure'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/routines/${id}`, { method: 'DELETE' });
            router.back();
          } catch (e) {
            console.error('Error deleting routine:', e);
          }
        },
      },
    ]);
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(t('deleteItem'), t('areYouSure'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/api/items/${itemId}`, { method: 'DELETE' });
            loadData();
          } catch (e) {
            console.error('Error deleting item:', e);
          }
        },
      },
    ]);
  };

  const handleToggleActive = async (value: boolean) => {
    try {
      await api(`/api/routines/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: value }),
      });
      setRoutine((prev: any) => ({ ...prev, is_active: value }));
    } catch (e) {
      console.error('Error toggling routine:', e);
    }
  };

  const priorityColor = (p: string) => {
    if (p === 'high') return colors.error;
    if (p === 'medium') return '#F59E0B';
    return colors.success;
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!routine) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <Text style={{ color: colors.text }}>Routine not found</Text>
      </View>
    );
  }

  const IconComp = getIconComponent(routine.icon);

  return (
    <View testID="routine-detail-screen" style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity testID="back-button" onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.topBarActions}>
          <TouchableOpacity
            testID="edit-routine-button"
            onPress={() => router.push(`/routine/create?id=${id}`)}
            style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
          >
            <Edit3 size={18} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity
            testID="delete-routine-button"
            onPress={handleDeleteRoutine}
            style={[styles.actionBtn, { backgroundColor: `${colors.error}15` }]}
          >
            <Trash2 size={18} color={colors.error} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Routine Info */}
        <View style={styles.routineInfo}>
          <View style={[styles.bigIcon, { backgroundColor: routine.color + '20' }]}>
            <IconComp size={32} color={routine.color} strokeWidth={2} />
          </View>
          <Text style={[styles.routineName, { color: colors.text }]}>{routine.name}</Text>
          {routine.description ? (
            <Text style={[styles.routineDesc, { color: colors.textMuted }]}>{routine.description}</Text>
          ) : null}

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{routine.current_streak}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('currentStreak')}</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{routine.best_streak}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('bestStreak')}</Text>
            </View>
          </View>

          {/* Active toggle */}
          <View style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('active')}</Text>
            <Switch
              testID="routine-active-toggle"
              value={routine.is_active}
              onValueChange={handleToggleActive}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Items Section */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsTitle, { color: colors.text }]}>
              {t('items')} ({items.length})
            </Text>
            <TouchableOpacity
              testID="add-item-button"
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/item/create?routineId=${id}`)}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.white} strokeWidth={2.5} />
              <Text style={styles.addBtnText}>{t('addItem')}</Text>
            </TouchableOpacity>
          </View>

          {items.length === 0 ? (
            <EmptyState title={t('noTasks')} message={t('noTasksMessage')} />
          ) : (
            items.map((item) => (
              <View
                testID={`item-row-${item.id}`}
                key={item.id}
                style={[styles.itemCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() => router.push(`/item/create?routineId=${id}&itemId=${item.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.priorityDot, { backgroundColor: priorityColor(item.priority) }]} />
                    <View style={styles.itemText}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      {item.notes ? (
                        <Text style={[styles.itemNotes, { color: colors.textMuted }]} numberOfLines={1}>{item.notes}</Text>
                      ) : null}
                      <View style={styles.itemMeta}>
                        <Text style={[styles.itemMetaText, { color: colors.textMuted }]}>
                          {t(item.priority)} · {item.repeat_per_day_count}x/{t('daily').toLowerCase()}
                        </Text>
                        {item.has_specific_time && item.time ? (
                          <Text style={[styles.itemMetaText, { color: colors.textMuted }]}> · {item.time}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                  <ChevronRight size={18} color={colors.textMuted} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  testID={`delete-item-${item.id}`}
                  onPress={() => handleDeleteItem(item.id)}
                  style={styles.deleteItemBtn}
                >
                  <Trash2 size={16} color={colors.error} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  backBtn: { padding: 8 },
  topBarActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  routineInfo: { alignItems: 'center', paddingTop: 8, paddingBottom: 24 },
  bigIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  routineName: { fontSize: 26, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  routineDesc: { fontSize: 15, textAlign: 'center', marginTop: 6, lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 14, borderWidth: 1,
  },
  statValue: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    width: '100%', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, marginTop: 12,
  },
  toggleLabel: { fontSize: 16, fontWeight: '600' },
  itemsSection: { marginTop: 8 },
  itemsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  itemsTitle: { fontSize: 18, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  itemCard: { borderRadius: 14, borderWidth: 1, marginBottom: 8, overflow: 'hidden' },
  itemContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, paddingRight: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: '600' },
  itemNotes: { fontSize: 13, marginTop: 2 },
  itemMeta: { flexDirection: 'row', marginTop: 4 },
  itemMetaText: { fontSize: 11, fontWeight: '500' },
  deleteItemBtn: { paddingHorizontal: 14, paddingVertical: 10, alignSelf: 'flex-end' },
});
