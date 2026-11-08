import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * Lays cards out in rows of `columns`, every card the same width. A short last row is padded
 * with empty space, so a lone card keeps its width instead of stretching across the row.
 */
export function CardGrid({ columns, children }: { columns: number; children: ReactNode }) {
  const cards = Children.toArray(children);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < cards.length; i += columns) rows.push(cards.slice(i, i + columns));
  return (
    <View style={styles.grid}>
      {rows.map((row, r) => (
        <View key={r} style={styles.row}>
          {row}
          {Array.from({ length: columns - row.length }, (_, i) => (
            <View key={`gap-${i}`} style={styles.filler} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  filler: { flex: 1 },
});
