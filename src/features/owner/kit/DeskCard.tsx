import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/** The bordered white card every owner screen uses (render: owner-reviews, owner-dashboard). */
export function DeskCard({
  children,
  onPress,
  label,
  tone = 'plain',
  style,
}: {
  children: ReactNode;
  onPress?: () => void;
  label?: string;
  tone?: 'plain' | 'wash' | 'selected' | 'alert';
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const look: ViewStyle = {
    borderColor: tone === 'selected' ? theme.fill : tone === 'alert' ? theme.error : theme.line,
    borderWidth: tone === 'selected' || tone === 'alert' ? 1.5 : 1,
    backgroundColor: tone === 'wash' ? theme.wash : theme.white,
  };
  if (!onPress) return <View style={[styles.card, look, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.card, look, pressed && { backgroundColor: theme.wash }, style]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: tokens.radius.lg, padding: tokens.space[4], gap: tokens.space[3] },
});
