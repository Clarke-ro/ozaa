import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * One line inside a Panel: something on the left (icon or code tile), a title and a grey line,
 * and something on the right. A thin line sits above every row, so a list reads as one table.
 */
export function PanelRow({
  leading,
  title,
  detail,
  trailing,
  onPress,
  label,
  chevron = Boolean(onPress),
  muted,
  checked,
}: {
  leading?: ReactNode;
  title: string;
  detail?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  /** Screen-reader label when the row says more than its title. */
  label?: string;
  chevron?: boolean;
  /** Greyed and struck through, e.g. a finished setup step. */
  muted?: boolean;
  /** For checklist rows: read out as checked or not. */
  checked?: boolean;
}) {
  const theme = useTheme();
  const [hovered, setHovered] = useState(false);
  const body = (
    <>
      {leading}
      <View style={styles.copy}>
        <Text
          variant="body-strong"
          numberOfLines={2}
          style={muted ? [styles.done, { color: theme.meta }] : undefined}
        >
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={18} color={theme.meta} /> : null}
    </>
  );
  const edge = { borderTopColor: theme.line };
  if (!onPress) return <View style={[styles.row, edge]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      accessibilityState={checked === undefined ? undefined : { checked }}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,
        edge,
        (pressed || hovered) && { backgroundColor: theme.wash },
      ]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget + tokens.space[4],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  copy: { flex: 1, gap: 2 },
  done: { textDecorationLine: 'line-through' },
});
