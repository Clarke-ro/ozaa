import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from './theme';
import { PHOTO_VEIL } from '@/theme/palette';

export function IconButton({
  label,
  onPress,
  children,
  light,
  style,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  light?: boolean;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.base, { backgroundColor: light ? PHOTO_VEIL : theme.tint }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
