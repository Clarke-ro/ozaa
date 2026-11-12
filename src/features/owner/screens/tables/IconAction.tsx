import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** A soft grey button with an icon before a short word: Share link, Download QR, Copy code. */
export function IconAction({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
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
  // Starts from its own text width and grows to fill the row, so a row of these can wrap on a
  // phone instead of cutting the labels short.
  iconAction: {
    flexGrow: 1,
    flexBasis: 'auto',
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
