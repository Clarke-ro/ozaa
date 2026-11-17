import { guestServices } from './guestServices';

const all = (['menu', 'wifi', 'loyalty', 'offers', 'play'] as const).map((id) => ({ id, section: 'table' as const, enabled: true }));

test('a switched-on service shows only once it is set up', () => {
  const ready = { wifi: true, loyalty: true, offers: true };
  expect(guestServices(all, ready).map((s) => s.id)).toEqual(['menu', 'wifi', 'loyalty', 'offers', 'play']);
  expect(guestServices(all, { wifi: false, loyalty: false, offers: false }).map((s) => s.id)).toEqual(['menu', 'play']);
});

test('a service the owner switched off stays off, even when set up', () => {
  const off = all.map((s) => (s.id === 'wifi' ? { ...s, enabled: false } : s));
  expect(guestServices(off, { wifi: true, loyalty: true, offers: true }).map((s) => s.id)).not.toContain('wifi');
});
