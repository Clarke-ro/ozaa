import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { SlimButtons } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from './layout';
import { NotificationBell } from './NotificationBell';

/**
 * The top of every owner page, sitting on the page itself: a bold title with an optional grey
 * line under it on the left, and the screen's one action and the bell on the right. On phones
 * the grey line goes under the whole row, so it is never squeezed beside the action.
 * A page opened from another one (one order, one customer) gets a small Back link above the
 * title on wide screens; phones have Back in their top bar instead.
 */
export function PageHeader({
  title,
  subtitle,
  action,
  bell,
  back,
  compact,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bell: boolean;
  back?: { label: string; onPress: () => void };
  /** A 20 px title instead of 24, for a long title on a phone (Today's greeting). */
  compact?: boolean;
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
      {wide && back ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={back.label}
          onPress={back.onPress}
          hitSlop={tokens.space[2]}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
        >
          <ChevronLeft size={16} color={theme.muted} />
          <Text variant="caption" style={{ color: theme.muted }}>
            {back.label}
          </Text>
        </Pressable>
      ) : null}
      <View style={styles.head}>
        <View style={styles.words}>
          <Text
            variant="title"
            accessibilityRole="header"
            numberOfLines={2}
            style={[styles.title, compact && styles.compact]}
          >
            {title}
          </Text>
          {wide ? lead : null}
        </View>
        {action ? (
          // Phones: header buttons go slim (40 px) so the title row stays light.
          <SlimButtons.Provider value={!wide}>
            <View style={styles.side}>{action}</View>
          </SlimButtons.Provider>
        ) : null}
        {bell ? <NotificationBell /> : null}
      </View>
      {wide ? null : lead}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[1] },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: tokens.space[1],
    marginBottom: tokens.space[1],
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  words: { flex: 1, gap: tokens.space[1] },
  // Large type reads loose, so it is tracked in a little (apple-motion §15); body text stays at 0.
  title: {
    fontSize: tokens.owner.pageTitle.size,
    lineHeight: tokens.owner.pageTitle.line,
    letterSpacing: -0.3,
  },
  compact: { fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  side: { flexShrink: 0 },
});
