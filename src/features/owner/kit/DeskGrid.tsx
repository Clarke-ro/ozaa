import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * Responsive grid: `phone` columns under 840 px, `wide` columns from 840 px (the tablet sidebar layout).
 * Children are wrapped so each takes an equal share of the row.
 */
export function DeskGrid({ children, phone = 1, wide = 2 }: { children: ReactNode[]; phone?: number; wide?: number }) {
  const { width } = useWindowDimensions();
  const cols = width >= 840 ? wide : phone;
  const basis = `${100 / cols}%` as const;
  return (
    <View style={styles.grid}>
      {children.map((child, index) => (
        <View key={index} style={[styles.cell, { width: basis }]}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -tokens.space[2] },
  cell: { paddingHorizontal: tokens.space[2], paddingBottom: tokens.space[4] },
});
