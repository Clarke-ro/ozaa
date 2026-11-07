import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * A section heading on Today: plain text on the page (no box), an optional grey count after it,
 * and one optional link on the right such as "See all".
 */
export function SectionHead({
  title,
  meta,
  action,
  onAction,
}: {
  title: string;
  meta?: string;
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
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2], flexShrink: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingLeft: tokens.space[2],
    borderRadius: tokens.radius.md,
  },
});
