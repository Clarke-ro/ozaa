import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from './layout';
import { NotificationBell } from './NotificationBell';

/**
 * The top of every owner page, sitting on the page itself: a bold title with an optional grey
 * line under it on the left, and the screen's one action and the bell on the right. On phones
 * the grey line goes under the whole row, so it is never squeezed beside the action.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  bell,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bell: boolean;
}) {
  const theme = useTheme();
  const { wide } = useOwnerLayout();
  const lead = subtitle ? (
    <Text variant="body" style={{ color: theme.muted }}>
      {subtitle}
    </Text>
  ) : null;

  return (
    <View style={styles.block}>
      <View style={styles.head}>
        <View style={styles.words}>
          <Text variant="title" accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {title}
          </Text>
          {wide ? lead : null}
        </View>
        {action ? <View style={styles.side}>{action}</View> : null}
        {bell ? <NotificationBell /> : null}
      </View>
      {wide ? null : lead}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[1] },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  words: { flex: 1, gap: tokens.space[1] },
  title: { fontSize: tokens.owner.pageTitle.size, lineHeight: tokens.owner.pageTitle.line },
  side: { flexShrink: 0 },
});
