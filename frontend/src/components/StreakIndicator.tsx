import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface StreakIndicatorProps {
  streak: number;
  compact?: boolean;
}

export function StreakIndicator({ streak, compact = false }: StreakIndicatorProps) {
  const { colors } = useTheme();

  if (streak <= 0) return null;

  return (
    <View testID="streak-indicator" style={[styles.container, { backgroundColor: `${colors.success}18` }]}>
      <Flame size={compact ? 14 : 16} color={colors.success} strokeWidth={2.5} />
      <Text style={[styles.text, { color: colors.success }, compact && styles.textCompact]}>
        {streak}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  textCompact: {
    fontSize: 12,
  },
});
