import { useWindowDimensions } from 'react-native';
import { tokens } from '@/theme/tokens';

const o = tokens.owner;

export type OwnerLayout = {
  /** Sidebar and top bar instead of the phone tab bar. */
  wide: boolean;
  /** Room for two columns side by side. */
  desktop: boolean;
  /** Left and right page margin. */
  gutter: number;
  /**
   * Padding inside a card. Phones use 16 instead of the canvas's 20, so cards feel a little
   * tighter on a small screen than on the web (Clarke, 2026-11-14).
   */
  cardPad: number;
};

/**
 * One place for the owner app's breakpoints, so the chrome, the page shell and the screens
 * always switch at the same widths (values live in design/tokens.json under "owner").
 */
export function useOwnerLayout(): OwnerLayout {
  const { width } = useWindowDimensions();
  const gutter =
    width >= o.desktopFrom
      ? o.controls.pagePadding
      : width >= o.tabletFrom
        ? tokens.space[6]
        : tokens.space[4];
  const wide = width >= o.wideFrom;
  return {
    wide,
    desktop: width >= o.desktopFrom,
    gutter,
    cardPad: wide ? o.controls.cardPadding : tokens.space[4],
  };
}
