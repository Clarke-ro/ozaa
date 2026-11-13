import type { ViewStyle } from 'react-native';
import { tokens } from '@/theme/tokens';
import type { Theme } from '@/ui/theme';

/**
 * The one card look in the owner app, as on the design canvas: white on the grey page, a 1 px
 * grey edge, 16 px corners and no shadow. Today's cards, category rows and the live menu card all use it, so pages read as
 * one set.
 */
export function cardStyle(theme: Theme): ViewStyle {
  return {
    backgroundColor: theme.surface,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: tokens.owner.controls.cardRadius,
    borderCurve: 'continuous',
  };
}
