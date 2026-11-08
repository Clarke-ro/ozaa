import { StyleSheet, type ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import type { Theme } from '@/ui/theme';

/**
 * The one card look in the owner app: white on the grey page, a hairline edge, soft corners and
 * no shadow. Today's cards, category rows and the live menu card all use it, so pages read as
 * one set.
 */
export function cardStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.surface,
    borderColor: theme.line,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  };
}
