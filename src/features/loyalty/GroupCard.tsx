import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { ROW_INSET } from './GroupRow';

/** One card holding a list of rows, with a thin line between them. */
export function GroupCard({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={[styles.card, { backgroundColor: theme.surface }]}>
      {rows.map((row, index) => (
        <Fragment key={index}>
          {index > 0 ? <View style={[styles.line, { backgroundColor: theme.line }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
    overflow: 'hidden',
  },
  // The line starts under the text, not under the icon, like iOS grouped lists.
  line: { height: StyleSheet.hairlineWidth, marginStart: ROW_INSET },
});
