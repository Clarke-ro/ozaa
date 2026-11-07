import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { FloorTable } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { gridRows } from '../orders/gridRows';
import { FloorTile } from './FloorTile';
import { floorColumns } from './floorGrid';

/**
 * The tables in equal columns (6 on a desktop, 4 with the sidebar, 3 on a small tablet,
 * 2 on a phone). Built as rows so every tile has the same width and the gaps stay even.
 */
export function TableGrid({
  tables,
  currency,
  picked,
  onPick,
}: {
  tables: readonly FloorTable[];
  currency: string;
  picked: string | null;
  onPick: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  return (
    <View style={styles.grid}>
      {gridRows(tables, floorColumns(width)).map((row, index) => (
        <View key={row[0]?.id ?? index} style={styles.row}>
          {row.map((table, cell) => (
            <View key={table?.id ?? `empty-${cell}`} style={styles.cell}>
              {table ? (
                <FloorTile
                  code={table.code}
                  label={table.label}
                  status={table.status}
                  billPesewas={table.billPesewas}
                  currency={currency}
                  selected={picked === table.id}
                  onPress={() => onPick(table.id)}
                />
              ) : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  // flexBasis 0 makes every cell the same width, whatever is inside it.
  cell: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
});
