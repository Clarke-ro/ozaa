import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const ICON_TILE = 40;
/** Where a row's text starts, so GroupCard's lines can line up with it. */
export const ROW_INSET = tokens.space[4] + ICON_TILE + tokens.space[3];

/** A row: an icon in a soft circle, a title with an optional line under it, then anything on the right. */
export function GroupRow({
  icon: Icon,
  title,
  detail,
  right,
  below,
  tone = 'default',
}: {
  icon: LucideIcon;
  title: string;
  detail?: string;
  right?: ReactNode;
  /** Shown under the text, e.g. a progress bar. */
  below?: ReactNode;
  tone?: 'default' | 'danger';
}) {
  const theme = useTheme();
  const danger = tone === 'danger';
  return (
    <View style={styles.row}>
      <View style={[styles.iconTile, { backgroundColor: danger ? theme.errorTint : theme.tint }]}>
        <Icon color={danger ? theme.error : theme.ink} size={20} strokeWidth={2} />
      </View>
      <View style={styles.text}>
        <Text variant="body-strong" style={danger ? { color: theme.error } : undefined}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {detail}
          </Text>
        ) : null}
        {below}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
    minHeight: 44,
  },
  iconTile: {
    width: ICON_TILE,
    height: ICON_TILE,
    borderRadius: ICON_TILE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
});
