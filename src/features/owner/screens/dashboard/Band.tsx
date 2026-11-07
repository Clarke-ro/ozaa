import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';

/**
 * One section of Today, sitting straight on the page: no box, no background, just a thin line
 * above it to split it from the section before. The first band (the day's numbers) has no line.
 * Each section owns its band, so a section that hides itself never leaves two lines in a row.
 */
export function Band({ children, first }: { children: ReactNode; first?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[styles.band, !first && [styles.ruled, { borderTopColor: theme.line }]]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { gap: tokens.space[3] },
  ruled: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: tokens.space[6] },
});
