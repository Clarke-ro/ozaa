import { StyleSheet } from 'react-native';
import { tokens } from '@/theme/tokens';

/** Styles shared by the Pay screen's cards: the bill, the split and the sum. */
export const payStyles = StyleSheet.create({
  card: {
    gap: tokens.space[2],
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  block: { gap: tokens.space[3] },
  line: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 28 },
  total: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[2],
    marginTop: tokens.space[1],
  },
  flex: { flex: 1 },
});
