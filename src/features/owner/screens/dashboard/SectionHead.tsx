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
  badgeTone = 'brand',
  action,
  onAction,
}: {
  title: string;
  meta?: string;
  /** A short value in a small orange pill, for progress. */
  badge?: string;
  /** A grey count instead of the orange one (canvas: "Earlier today 1"). */
  badgeTone?: 'brand' | 'neutral';
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
          <View
            style={[
              styles.badge,
              { backgroundColor: badgeTone === 'brand' ? theme.fill : theme.wash },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: badgeTone === 'brand' ? theme.onFill : theme.text },
              ]}
            >
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
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  // Canvas badge: 13/18 semibold, 2 px by 9 px padding, fully round.
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  badgeText: { fontFamily: fontFamily.strong, fontSize: 13, lineHeight: 18 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingLeft: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
});
