import { Pressable, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/** A square outline button with an icon over a short word: Share, Download, Copy. */
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
        { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
      ]}
    >
      <Icon size={18} color={theme.ink} />
      <Text variant="caption" numberOfLines={1} style={{ fontFamily: fontFamily.strong }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[1],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
});
