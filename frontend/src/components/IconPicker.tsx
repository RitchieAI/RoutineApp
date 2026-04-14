import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import {
  Sun, Moon, Dumbbell, BookOpen, Heart,
  Briefcase, Coffee, Music, Pencil, Star, ListChecks,
} from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { ROUTINE_ICON_NAMES } from '../utils/constants';

const ICON_MAP: Record<string, any> = {
  sun: Sun,
  moon: Moon,
  dumbbell: Dumbbell,
  book: BookOpen,
  heart: Heart,
  briefcase: Briefcase,
  coffee: Coffee,
  music: Music,
  pencil: Pencil,
  star: Star,
  list: ListChecks,
};

interface IconPickerProps {
  selected: string;
  onSelect: (icon: string) => void;
  accentColor?: string;
}

export function IconPicker({ selected, onSelect, accentColor }: IconPickerProps) {
  const { colors } = useTheme();
  const accent = accentColor || colors.primary;

  return (
    <View style={styles.grid}>
      {ROUTINE_ICON_NAMES.map((name) => {
        const IconComponent = ICON_MAP[name] || ListChecks;
        const isSelected = selected === name;
        return (
          <TouchableOpacity
            testID={`icon-option-${name}`}
            key={name}
            onPress={() => onSelect(name)}
            style={[
              styles.iconBtn,
              {
                backgroundColor: isSelected ? accent : colors.surfaceElevated,
                borderColor: isSelected ? accent : colors.border,
              },
            ]}
          >
            <IconComponent
              size={22}
              color={isSelected ? colors.white : colors.textMuted}
              strokeWidth={2}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function getIconComponent(name: string) {
  return ICON_MAP[name] || ListChecks;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
});
