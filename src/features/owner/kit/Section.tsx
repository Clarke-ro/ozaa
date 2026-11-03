import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * One group of settings: a short caps title, rows in an inset card split by hairlines,
 * and an optional one-line note under it. The iOS Settings pattern.
 */
export function Section({
  title,
  note,
  action,
  children,
}: {
  title?: string;
  /** One short line under the card. Keep it to what the owner can't guess. */
  note?: string;
  /** Optional small control on the right of the title, such as a text button. */
  action?: ReactNode;
  children: ReactNode;
}) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={styles.wrap}>
      {title || action ? (
        <View style={styles.head}>
          {title ? (
            <Text
              variant="caption"
              accessibilityRole="header"
              style={[styles.title, { color: theme.muted }]}
            >
              {title.toUpperCase()}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}
      <View style={[styles.card, { borderColor: theme.line, backgroundColor: theme.surface }]}>
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <View style={[styles.rule, { backgroundColor: theme.line }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {note ? (
        <Text variant="caption" style={[styles.note, { color: theme.muted }]}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 20,
    paddingHorizontal: tokens.space[1],
  },
  title: { fontFamily: 'Inter_600', letterSpacing: 0.8 },
  card: {
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: tokens.space[4] },
  note: { paddingHorizontal: tokens.space[1] },
});
