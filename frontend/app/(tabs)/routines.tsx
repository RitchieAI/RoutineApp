import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/utils/api';
import { StreakIndicator } from '../../src/components/StreakIndicator';
import { EmptyState } from '../../src/components/EmptyState';
import { getIconComponent } from '../../src/components/IconPicker';
import { Plus, ChevronRight } from 'lucide-react-native';

export default function RoutinesScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRoutines = useCallback(async () => {
    try {
      const data = await api('/api/routines');
      setRoutines(data);
    } catch (e) {
      console.error('Error loading routines:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRoutines();
    }, [loadRoutines])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadRoutines();
  };

  if (loading) {
    return (
      <View testID="routines-loading" style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View testID="routines-screen" style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('routines')}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {routines.length === 0 ? (
          <EmptyState title={t('noRoutines')} message={t('noRoutinesMessage')} />
        ) : (
          routines.map((routine) => {
            const IconComp = getIconComponent(routine.icon);
            return (
              <TouchableOpacity
                testID={`routine-card-${routine.id}`}
                key={routine.id}
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push(`/routine/${routine.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.cardLeft}>
                  <View style={[styles.iconCircle, { backgroundColor: routine.color + '20' }]}>
                    <IconComp size={22} color={routine.color} strokeWidth={2} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{routine.name}</Text>
                    {routine.description ? (
                      <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={1}>
                        {routine.description}
                      </Text>
                    ) : null}
                    <View style={styles.cardMeta}>
                      <Text style={[styles.recurrenceTag, { color: colors.textMuted, backgroundColor: colors.surfaceElevated }]}>
                        {t(routine.recurrence_type)}
                      </Text>
                      {!routine.is_active && (
                        <Text style={[styles.inactiveTag, { color: colors.error, backgroundColor: `${colors.error}15` }]}>
                          {t('inactive')}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <StreakIndicator streak={routine.current_streak} compact />
                  <ChevronRight size={20} color={colors.textMuted} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        testID="create-routine-button"
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/routine/create')}
        activeOpacity={0.7}
      >
        <Plus size={28} color={colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  scrollContent: { paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 14 },
  iconCircle: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 17, fontWeight: '700' },
  cardDesc: { fontSize: 13, marginTop: 2 },
  cardMeta: { flexDirection: 'row', gap: 6, marginTop: 6 },
  recurrenceTag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  inactiveTag: { fontSize: 11, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});
