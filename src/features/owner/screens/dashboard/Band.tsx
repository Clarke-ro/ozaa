import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * One section of Today: a heading and its cards, split from the next section by space alone.
 * Each section owns its band, so a section that hides itself leaves no empty gap behind.
 */
export function Band({ children }: { children: ReactNode }) {
  return <View style={styles.band}>{children}</View>;
}

const styles = StyleSheet.create({
  band: { gap: tokens.owner.controls.headGap },
});
