import { refundCharge } from './refund';

const paid = {
  id: 'txn_1',
  amountPesewas: 9500,
  status: 'succeeded' as const,
  settlement: 'settled' as const,
};

test('a succeeded charge refunds only the full amount', () => {
  expect(refundCharge(paid, 9500)).toEqual({
    ok: true,
    settlement: 'refunded',
    refundedPesewas: 9500,
  });
  expect(refundCharge({ ...paid, settlement: 'pending' }, 9500).ok).toBe(true);
});

test('a failed, partial, or already refunded charge is refused', () => {
  expect(refundCharge({ ...paid, status: 'failed' }, 9500)).toEqual({
    ok: false,
    reason: 'not_succeeded',
  });
  expect(refundCharge({ ...paid, status: 'pending' }, 9500)).toEqual({
    ok: false,
    reason: 'not_succeeded',
  });
  expect(refundCharge(paid, 1000)).toEqual({ ok: false, reason: 'amount' });
  expect(refundCharge({ ...paid, settlement: 'refunded' }, 9500)).toEqual({
    ok: false,
    reason: 'already_refunded',
  });
});
