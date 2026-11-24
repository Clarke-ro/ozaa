import { StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';

/**
 * The one spacing rhythm for the dish form (design/brand.md section 8): sections far apart,
 * fields in a section 16 px apart, a label 8 px above its control, and pairs side by side
 * that wrap to one column on a phone.
 */
export const fieldStyles = StyleSheet.create({
  block: { gap: tokens.space[2] },
  pair: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[4] },
  half: { flexGrow: 1, flexBasis: 160, minWidth: 0 },
});
