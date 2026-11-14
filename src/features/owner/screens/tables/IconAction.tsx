import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/**
 * A soft grey button with an icon before a short word: Share link, Download QR, Copy code.
 * `compact` is the canvas's 36 px round white icon button; the label is then only read aloud.
 */
export function IconAction({
  icon: Icon,
  label,
  onPress,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  const theme = useTheme();
  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        hitSlop={4}
        style={({ pressed }) => [
          styles.round,
          { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
        ]}
      >
        <Icon size={16} color={theme.text} />
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconAction,
        { backgroundColor: pressed ? theme.line : theme.wash },
      ]}
    >
      <Icon size={18} color={theme.text} />
      <Text variant="body-strong" numberOfLines={1} style={{ fontFamily: fontFamily.strong }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
});
