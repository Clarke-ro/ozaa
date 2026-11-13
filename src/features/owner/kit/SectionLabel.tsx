import { Pressable, StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * Section heading. `caps` gives the grey uppercase label from owner-services ("AT YOUR TABLE");
 * otherwise a title with an optional "See all" link (dashboard "Live orders").
 */
export function SectionLabel({
  title,
  caps,
  action,
  onAction,
}: {
  title: string;
  caps?: boolean;
  action?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {caps ? (
        <Text
          variant="caption"
          accessibilityRole="header"
          style={[styles.caps, { color: theme.muted }]}
        >
          {title.toUpperCase()}
        </Text>
      ) : (
        <Text variant="title" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      )}
      {action && onAction ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={10}>
          <Text variant="body" style={{ color: theme.muted }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: tokens.space[2],
  },
  caps: { fontFamily: 'Inter_600', letterSpacing: 0.8 },
  title: { fontSize: tokens.owner.type.title.size, lineHeight: tokens.owner.type.title.line },
});
