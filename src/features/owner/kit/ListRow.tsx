import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { IconTile } from './IconTile';

/** One list row: icon tile, title, detail line and a trailing slot (switch, price, chevron). */
export function ListRow({
  title,
  detail,
  icon,
  lead,
  trailing,
  onPress,
  divider = true,
  chevron,
}: {
  title: string;
  detail?: string | ReactNode;
  icon?: LucideIcon;
  lead?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  divider?: boolean;
  chevron?: boolean;
}) {
  const theme = useTheme();
  const body = (
    <>
      {lead ?? (icon ? <IconTile icon={icon} /> : null)}
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        {typeof detail === 'string' ? (
          <Text variant="caption" style={{ color: theme.muted }} numberOfLines={2}>
            {detail}
          </Text>
        ) : (
          detail ?? null
        )}
      </View>
      {trailing}
      {chevron ? <ChevronRight size={20} color={theme.meta} /> : null}
    </>
  );
  const line = divider ? { borderBottomWidth: 1, borderBottomColor: theme.line } : null;
  if (!onPress) return <View style={[styles.row, line]}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.row, line, pressed && { backgroundColor: theme.wash }]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[3], minHeight: 56 },
  copy: { flex: 1, gap: 2 },
});
