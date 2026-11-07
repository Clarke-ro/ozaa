import { tokens } from '@/theme/tokens';
import { floorColumns } from './floorGrid';

const o = tokens.owner;

describe('floorColumns', () => {
  it('shows 2 tables across on a phone', () => {
    expect(floorColumns(390)).toBe(2);
  });

  it('shows 3 across from the tablet width', () => {
    expect(floorColumns(o.tabletFrom)).toBe(3);
  });

  it('shows 4 across once the sidebar appears', () => {
    expect(floorColumns(o.wideFrom)).toBe(4);
    expect(floorColumns(1024)).toBe(4);
  });

  it('shows 6 across on a desktop', () => {
    expect(floorColumns(o.desktopFrom)).toBe(6);
    expect(floorColumns(1440)).toBe(6);
  });
});
