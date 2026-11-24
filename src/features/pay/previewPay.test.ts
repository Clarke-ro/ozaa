import { pesewas } from '@/lib/brand';
import { previewPay } from './previewPay';

const lines = [
  { id: 'a', totalPesewas: pesewas(6500) },
  { id: 'b', totalPesewas: pesewas(4500) },
  { id: 'c', totalPesewas: pesewas(1500) },
];
const base = { pick: 'momo' as const, mode: 'whole' as const, parts: 2, tip: 0 as const, mine: [] };

test('whole bill, no tip, no fee: you pay the total', () => {
  expect(previewPay(lines, 12500, base, undefined)).toEqual({
    share: 12500,
    tip: 0,
    fee: 0,
    due: 12500,
  });
});

test('split equally between 3, with 10%: the first share takes the leftover pesewa', () => {
  const sum = previewPay(lines, 12500, { ...base, mode: 'equal', parts: 3, tip: 10 }, undefined);
  expect(sum.share).toBe(4167);
  expect(sum.tip).toBe(417);
  expect(sum.due).toBe(4167 + 417);
});

test('a fee the venue passes on is added before the guest pays', () => {
  const sum = previewPay(lines, 12500, base, { online: true, feePercent: 100 });
  expect(sum.fee).toBeGreaterThan(0);
  expect(sum.due).toBe(12500 + sum.fee);
});

test('cash: the whole total, paid in person, so no tip and no fee', () => {
  const sum = previewPay(
    lines,
    12500,
    { ...base, pick: 'cash', tip: 10 },
    { online: true, feePercent: 100 },
  );
  expect(sum).toEqual({ share: 12500, tip: 0, fee: 0, due: 12500 });
});

test('my items: only the ticked dishes, and nothing to pay until one is ticked', () => {
  expect(
    previewPay(lines, 12500, { ...base, mode: 'items', mine: ['a', 'c'] }, undefined).due,
  ).toBe(8000);
  expect(previewPay(lines, 12500, { ...base, mode: 'items', mine: [] }, undefined).due).toBe(0);
});
