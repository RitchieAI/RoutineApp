import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/utils/api';
import { TaskItemRow } from '../../src/components/TaskItemRow';
import { StreakIndicator } from '../../src/components/StreakIndicator';
import { EmptyState } from '../../src/components/EmptyState';
import { getIconComponent } from '../../src/components/IconPicker';
import { Plus } from 'lucide-react-native';

interface RoutineGroup {
  routine: any;
  instances: any[];
  completedCount: number;
  totalCount: number;
}

export default function TodayScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [groups, setGroups] = useState<RoutineGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadToday = useCallback(async () => {
    try {
      const data = await api('/api/instances/today');
      setGroups(data.groups || []);
    } catch (e) {
      console.error('Error loading today:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const onRefresh = () => {
    setRefreshing(true);
    loadToday();
  };

  const toggleInstance = async (instanceId: string, isCompleted: boolean) => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        instances: g.instances.map(inst =>
          inst.id === instanceId ? { ...inst, is_completed: !isCompleted } : inst
        ),
        completedCount: g.instances.reduce((sum, inst) => {
          if (inst.id === instanceId) return sum + (!isCompleted ? 1 : 0);
          return sum + (inst.is_completed ? 1 : 0);
        }, 0),
      }))
    );

    try {
      await api(`/api/instances/${instanceId}/toggle`, {
        method: 'PUT',
        body: JSON.stringify({ is_completed: !isCompleted }),
      });
      loadToday();
    } catch (e) {
      console.error('Error toggling:', e);
      loadToday();
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  };

  const totalTasks = groups.reduce((s, g) => s + g.totalCount, 0);
  const completedTasks = groups.reduce((s, g) => s + g.completedCount, 0);
  const allDone = totalTasks > 0 && completedTasks === totalTasks;

  if (loading) {
    return (
      <View testID="today-loading" style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View testID="today-screen" style={[styles.container, { backgroundColor: colors.bg, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.textMuted }]}>{getGreeting()}</Text>
        <Text style={[styles.userName, { color: colors.text }]}>{user?.name || ''}</Text>
        {totalTasks > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.surfaceElevated }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${(completedTasks / totalTasks) * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {completedTasks}/{totalTasks} {t('tasksCompleted')}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {groups.length === 0 ? (
          <EmptyState
            title={t('nothingForToday')}
            message={t('nothingForTodayMessage')}
          />
        ) : allDone ? (
          <EmptyState
            title={t('allDone')}
            message={t('allDoneMessage')}
            isSuccess
          />
        ) : (
          groups.map((group) => {
            const IconComp = getIconComponent(group.routine.icon);
            return (
              <View
                testID={`routine-group-${group.routine.id}`}
                key={group.routine.id}
                style={[styles.routineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <TouchableOpacity
                  testID={`routine-header-${group.routine.id}`}
                  style={styles.routineHeader}
                  onPress={() => router.push(`/routine/${group.routine.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.routineHeaderLeft}>
                    <View style={[styles.iconCircle, { backgroundColor: group.routine.color + '20' }]}>
                      <IconComp size={18} color={group.routine.color} strokeWidth={2} />
                    </View>
                    <View>
                      <Text style={[styles.routineName, { color: colors.text }]}>{group.routine.name}</Text>
                      <Text style={[styles.routineCount, { color: colors.textMuted }]}>
                        {group.completedCount}/{group.totalCount} {t('tasksCompleted')}
                      </Text>
                    </View>
                  </View>
                  <StreakIndicator streak={group.routine.current_streak} compact />
                </TouchableOpacity>

                <View style={styles.tasksList}>
                  {group.instances.map((inst) => (
                    <TaskItemRow
                      key={inst.id}
                      id={inst.id}
                      title={inst.title_snapshot}
                      scheduledTime={inst.scheduled_time}
                      isCompleted={inst.is_completed}
                      onToggle={toggleInstance}
                    />
                  ))}
                </View>
              </View>
            );
          })
        )}
        <View style={{ height: 32 }} />
      </ScrollView>

      <TouchableOpacity
        testID="create-routine-fab"
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
  greeting: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5 },
  userName: { fontSize: 30, fontWeight: '800', marginTop: 4, letterSpacing: -0.5 },
  progressRow: { marginTop: 16, gap: 8 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 13, fontWeight: '500' },
  scrollView: { flex: 1, paddingHorizontal: 24 },
  scrollContent: { paddingTop: 8 },
  routineCard: { borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  routineHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconCircle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  routineName: { fontSize: 17, fontWeight: '700' },
  routineCount: { fontSize: 12, marginTop: 2 },
  tasksList: { paddingHorizontal: 16, paddingBottom: 8 },
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
