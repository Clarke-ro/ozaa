import { tokens } from '@/theme/tokens';

const o = tokens.owner;

/**
 * How many table tiles fit across. Tiles stay roughly the same size on every screen
 * (about 140 to 190 px wide), so a waiter's eye learns one shape.
 */
export function floorColumns(width: number): number {
  if (width >= o.desktopFrom) return 6;
  if (width >= o.wideFrom) return 4;
  if (width >= o.tabletFrom) return 3;
  return 2;
}
