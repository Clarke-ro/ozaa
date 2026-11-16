import { canOrderHere } from './useCanOrder';

const on = {
  enabled: true,
  pickup: { enabled: true, prepMinutes: 15 },
  delivery: { enabled: false, minimumFeePesewas: 0, feePerKmPesewas: 0, maxDistanceKm: 5 },
};

test('a guest at a table they scanned can always order', () => {
  expect(canOrderHere(true, { onlineOrdering: undefined })).toBe(true);
});

test('from the venue link, only when the venue takes online orders', () => {
  expect(canOrderHere(false, { onlineOrdering: on })).toBe(true);
  expect(canOrderHere(false, { onlineOrdering: { ...on, enabled: false } })).toBe(false);
  expect(canOrderHere(false, {})).toBe(false);
});
