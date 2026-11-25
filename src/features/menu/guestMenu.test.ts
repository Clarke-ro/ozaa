import type { MenuCategory, ModifierGroup } from '@/lib/api/types';
import { activeSection, priceFrom, sectionsOnNow, soldOutLast } from './guestMenu';

const NOW = new Date('2026-11-25T12:00:00.000Z'); // a Wednesday, noon in Accra
const section = (id: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name: { en: id },
  kind: 'food',
  position: 0,
  ...over,
});

describe('sectionsOnNow', () => {
  test('hidden sections and ones outside their hours are left out', () => {
    const out = sectionsOnNow(
      [
        section('mains'),
        section('secret', { hidden: true }),
        section('brunch', { schedule: { startTime: '07:00', endTime: '11:00' } }),
        section('lunch', { schedule: { startTime: '11:00', endTime: '15:00' } }),
      ],
      NOW,
    );
    expect(out.map((s) => s.id)).toEqual(['mains', 'lunch']);
  });
  test('food first, then drinks, each in the venue order', () => {
    const out = sectionsOnNow(
      [
        section('water', { kind: 'drinks', position: 0 }),
        section('b', { position: 2 }),
        section('a', { position: 1 }),
      ],
      NOW,
    );
    expect(out.map((s) => s.id)).toEqual(['a', 'b', 'water']);
  });
});

test('soldOutLast keeps the owner order, with sold-out dishes at the end of it', () => {
  const dishes = [
    { id: 'a', available: false },
    { id: 'b', available: true },
    { id: 'c', available: false },
    { id: 'd', available: true },
  ];
  expect(soldOutLast(dishes).map((d) => d.id)).toEqual(['b', 'd', 'a', 'c']);
});

describe('priceFrom', () => {
  const option = (id: string, pricePesewas: number) => ({ id, name: { en: id }, pricePesewas });
  const size: ModifierGroup = {
    id: 'size',
    name: { en: 'Size' },
    min: 1,
    max: 1,
    options: [option('lg', 1500), option('rg', 500)],
  };
  const dish = (modifierGroups: ModifierGroup[], over = {}) => ({
    pricePesewas: 4000,
    available: true,
    modifierGroups,
    ...over,
  });
  test('no required choice: just the price', () => {
    expect(priceFrom(dish([]))).toEqual({ from: false, pesewas: 4000 });
  });
  test('a required choice adds its cheapest option and says "from"', () => {
    expect(priceFrom(dish([size]))).toEqual({ from: true, pesewas: 4500 });
  });
  test('a sale price is the starting point', () => {
    expect(priceFrom(dish([size], { salePricePesewas: 3000 }))).toEqual({
      from: true,
      pesewas: 3500,
    });
  });
  test('a required choice where every option costs the same is not "from"', () => {
    const spice = { ...size, options: [option('mild', 0), option('hot', 0)] };
    expect(priceFrom(dish([spice]))).toEqual({ from: false, pesewas: 4000 });
  });
});

describe('activeSection', () => {
  const headings = [
    { id: 'mains', y: 300 },
    { id: 'sides', y: 900 },
    { id: 'drinks', y: 1500 },
  ];
  test('the last section whose heading has reached the bar', () => {
    expect(activeSection(headings, 0)).toBe('mains');
    expect(activeSection(headings, 899)).toBe('mains');
    expect(activeSection(headings, 900)).toBe('sides');
    expect(activeSection(headings, 5000)).toBe('drinks');
  });
  test('none when there are no sections', () => {
    expect(activeSection([], 100)).toBeNull();
  });
});
