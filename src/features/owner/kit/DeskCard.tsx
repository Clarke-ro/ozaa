import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/** The flat bordered card owner screens use for one item. For lists, prefer Panel with PanelRows. */
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
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  // Flat with a thin border. Selected and alert swap the border for a stronger coloured one.
  const strong = tone === 'selected' || tone === 'alert';
  const look: ViewStyle = {
    borderColor: tone === 'selected' ? theme.fill : tone === 'alert' ? theme.error : theme.line,
    borderWidth: strong ? 1.5 : tone === 'wash' ? 0 : StyleSheet.hairlineWidth,
    backgroundColor: tone === 'wash' ? theme.wash : theme.surface,
  };
  if (!onPress) return <View style={[styles.card, look, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        look,
        pressed && { backgroundColor: theme.wash },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
});
