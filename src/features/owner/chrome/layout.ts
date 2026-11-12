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
};

/**
 * One place for the owner app's breakpoints, so the chrome, the page shell and the screens
 * always switch at the same widths (values live in design/tokens.json under "owner").
 */
export function useOwnerLayout(): OwnerLayout {
  const { width } = useWindowDimensions();
  const gutter =
    width >= o.desktopFrom
      ? tokens.space[8]
      : width >= o.tabletFrom
        ? tokens.space[6]
        : tokens.space[4];
  return { wide: width >= o.wideFrom, desktop: width >= o.desktopFrom, gutter };
}
