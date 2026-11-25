import { countsForMostOrdered, mostOrdered, MOST_ORDERED_SINCE_MS } from './mostOrdered';

const NOW = Date.parse('2026-11-25T12:00:00Z');
const onMenu = () => true;

describe('mostOrdered', () => {
  it('ranks dishes by how many were ordered, most first', () => {
    const lines = [
      { menuItemId: 'a', quantity: 1 },
      { menuItemId: 'b', quantity: 3 },
      { menuItemId: 'a', quantity: 1 },
      { menuItemId: 'c', quantity: 1 },
    ];
    expect(mostOrdered(lines, onMenu)).toEqual(['b', 'a', 'c']);
  });

  it('keeps the top five', () => {
    const lines = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({
      menuItemId: id,
      quantity: 10 - i,
    }));
    expect(mostOrdered(lines, onMenu)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('breaks ties by id, so the row does not shuffle between visits', () => {
    const lines = [
      { menuItemId: 'z', quantity: 2 },
      { menuItemId: 'm', quantity: 2 },
    ];
    expect(mostOrdered(lines, onMenu)).toEqual(['m', 'z']);
  });

  it('leaves out dishes no longer on the guest menu', () => {
    const lines = [
      { menuItemId: 'gone', quantity: 9 },
      { menuItemId: 'a', quantity: 1 },
    ];
    expect(mostOrdered(lines, (id) => id !== 'gone')).toEqual(['a']);
  });

  it('is empty when nothing was ordered', () => {
    expect(mostOrdered([], onMenu)).toEqual([]);
  });
});

describe('countsForMostOrdered', () => {
  const at = (msAgo: number) => new Date(NOW - msAgo).toISOString();

  it('counts orders from the last 30 days', () => {
    expect(countsForMostOrdered({ status: 'served', createdAt: at(1000) }, NOW)).toBe(true);
    expect(
      countsForMostOrdered({ status: 'received', createdAt: at(MOST_ORDERED_SINCE_MS - 1) }, NOW),
    ).toBe(true);
  });

  it('skips older orders', () => {
    expect(
      countsForMostOrdered({ status: 'served', createdAt: at(MOST_ORDERED_SINCE_MS + 1) }, NOW),
    ).toBe(false);
  });

  it('skips cancelled orders', () => {
    expect(countsForMostOrdered({ status: 'cancelled', createdAt: at(1000) }, NOW)).toBe(false);
  });
});
