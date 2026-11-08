import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from './cardStyle';

/**
 * One group of settings as a white card: a bold title (with an optional small control on its
 * right) inside the top of the card, then the rows split by hairlines, and an optional one-line
 * note under the card. Every settings page uses it, so they all read the same.
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
      <View style={[styles.card, cardStyle(theme)]}>
        {title || action ? (
          <View style={styles.head}>
            {title ? (
              <Text variant="title" accessibilityRole="header" style={styles.title}>
                {title}
              </Text>
            ) : (
              <View />
            )}
            {action}
          </View>
        ) : null}
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
  card: { overflow: 'hidden' },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingTop: tokens.space[4],
    paddingBottom: tokens.space[1],
  },
  title: { flexShrink: 1 },
  rule: { height: StyleSheet.hairlineWidth, marginLeft: tokens.space[4] },
  note: { paddingHorizontal: tokens.space[1] },
});
