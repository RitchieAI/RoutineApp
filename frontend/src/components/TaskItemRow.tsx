import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

interface TaskItemRowProps {
  id: string;
  title: string;
  notes?: string;
  isCompleted: boolean;
  scheduledTime?: string;
  onToggle: (id: string, currentState: boolean) => void;
  checkboxPosition?: 'left' | 'right';
}

function TaskItemRowComponent({ id, title, notes, isCompleted, scheduledTime, onToggle, checkboxPosition = 'left' }: TaskItemRowProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.92, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(id, isCompleted);
  };

  const isCheckboxLeft = checkboxPosition === 'left';

  return (
    <TouchableOpacity
      testID={`task-item-${id}`}
      onPress={handlePress}
      activeOpacity={0.7}
      style={[styles.container, { borderBottomColor: colors.border }]}
    >
      <View
        style={[
          styles.row,
          { flexDirection: 'row', justifyContent: isCheckboxLeft ? 'flex-start' : 'space-between', alignItems: 'center' },
        ]}
      >
        {isCheckboxLeft ? (
          <>
            <Animated.View style={animatedStyle}>
              <View
                testID={`task-checkbox-${id}`}
                style={[
                  styles.checkbox,
                  isCompleted
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.textMuted },
                ]}
              >
                {isCompleted && <Check size={16} color={colors.white} strokeWidth={3} />}
              </View>
            </Animated.View>
            <View style={[styles.textContainer, { marginLeft: 14, marginRight: 0 }]}> 
              <Text
                style={[
                  styles.title,
                  { color: isCompleted ? colors.textMuted : colors.text },
                  isCompleted && styles.titleCompleted,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {notes ? (
                <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={1}>{notes}</Text>
              ) : null}
              {scheduledTime ? (
                <Text style={[styles.time, { color: colors.textMuted }]}>{scheduledTime}</Text>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <View style={[styles.textContainer, { marginLeft: 0, marginRight: 0, flex: 1 }]}> 
              <Text
                style={[
                  styles.title,
                  { color: isCompleted ? colors.textMuted : colors.text },
                  isCompleted && styles.titleCompleted,
                ]}
                numberOfLines={1}
              >
                {title}
              </Text>
              {notes ? (
                <Text style={[styles.notes, { color: colors.textMuted }]} numberOfLines={1}>{notes}</Text>
              ) : null}
              {scheduledTime ? (
                <Text style={[styles.time, { color: colors.textMuted }]}>{scheduledTime}</Text>
              ) : null}
            </View>
            <Animated.View style={animatedStyle}>
              <View
                testID={`task-checkbox-${id}`}
                style={[
                  styles.checkbox,
                  isCompleted
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.textMuted },
                ]}
              >
                {isCompleted && <Check size={16} color={colors.white} strokeWidth={3} />}
              </View>
            </Animated.View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const TaskItemRow = React.memo(TaskItemRowComponent);

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowReversed: {
    flexDirection: 'row-reverse',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  time: {
    fontSize: 12,
    marginTop: 2,
  },
  notes: {
    fontSize: 12,
    marginTop: 2,
  },
});
