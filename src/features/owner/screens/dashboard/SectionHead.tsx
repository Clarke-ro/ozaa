import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

/**
 * A section heading on Today: the title, then either a grey count ("2 waiting") or a small
 * orange badge ("48%"), and one optional link on the right such as "See all".
 */
export function SectionHead({
  title,
  meta,
  badge,
  action,
  onAction,
}: {
  title: string;
  meta?: string;
  /** A short value in a small orange pill, for progress. */
  badge?: string;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.head}>
      <View style={styles.heading}>
        <Text variant="title" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: theme.fill }]}>
            <Text variant="caption" style={[styles.badgeText, { color: theme.onFill }]}>
              {badge}
            </Text>
          </View>
        ) : null}
        {meta ? (
          <Text variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {action && onAction ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={action}
          onPress={onAction}
          style={({ pressed }) => [styles.link, pressed && { backgroundColor: theme.wash }]}
        >
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {action}
          </Text>
          <ChevronRight size={20} color={theme.ink} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    minHeight: tokens.touchTarget,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], flexShrink: 1 },
  badge: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  badgeText: { fontFamily: fontFamily.strong },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingLeft: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
});
