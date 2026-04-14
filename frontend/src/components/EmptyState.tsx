import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Inbox } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface EmptyStateProps {
  title: string;
  message: string;
  isSuccess?: boolean;
}

export function EmptyState({ title, message, isSuccess = false }: EmptyStateProps) {
  const { colors } = useTheme();
  const Icon = isSuccess ? CheckCircle2 : Inbox;
  const iconColor = isSuccess ? colors.success : colors.textMuted;

  return (
    <View testID="empty-state" style={styles.container}>
      <View style={[styles.iconCircle, { backgroundColor: `${iconColor}15` }]}>
        <Icon size={48} color={iconColor} strokeWidth={1.5} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
