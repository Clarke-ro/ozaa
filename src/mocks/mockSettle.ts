import { currencyCode, minor } from '../features/loyalty/facts';
import { ghanaPhone, isGhanaPhone } from '@/lib/brand';
import type { TokenSource } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { Payment } from '@/lib/api/types';
import { readMockCard } from './cardBox';
import { findOrder, keepLoyalty, venueById } from './world';
import type { World } from './world';

/**
 * Moves a mock payment along (MoMo by the phone's last digit, card by the mock checkout page)
 * and, once it has succeeded, puts the money on the order and the visit on the loyalty card.
 */
export function settlePayment(
  world: World,
  tokens: TokenSource,
  now: () => number,
  reference: string,
): Payment {
  const row = world.payments.get(reference);
  if (!row) throw new ApiError(404, 'payment_not_found', 'Payment not found');
  const clock = now();
  const choice = readMockCard(reference);
  if (choice && (row.payment.status === 'open_url' || row.payment.status === 'pending')) {
    row.payment = { ...row.payment, status: choice === 'succeeded' ? 'succeeded' : 'abandoned' };
  }
  if (row.payment.status === 'pay_offline' || row.payment.status === 'pending') {
    const digit = row.phone.slice(-1);
    const elapsed = clock - Date.parse(row.payment.createdAt);
    const approveBy = row.payment.approveBy ? Date.parse(row.payment.approveBy) : clock;
    if (digit === '9' && clock >= approveBy) row.payment = { ...row.payment, status: 'abandoned' };
    else if (digit === '0' && elapsed >= 5_000) {
      row.payment = {
        ...row.payment,
        status: 'failed',
        failureReason: 'Not enough money in the wallet.',
      };
    } else if (
      digit !== '9' &&
      digit !== '0' &&
      elapsed >= 5_000 &&
      row.payment.method === 'momo'
    ) {
      row.payment = {
        ...row.payment,
        status: 'succeeded',
        paidAt: new Date(clock).toISOString(),
      };
    }
  }
  if (row.payment.status === 'succeeded' && !row.applied) {
    row.applied = true;
    const quote = row.quoteId ? world.quotes.get(row.quoteId) : undefined;
    const live = findOrder(world, row.payment.orderId);
    const share = row.payment.amountPesewas - (row.payment.tipPesewas ?? 0);
    const paid = live.order.paidPesewas + share;
    const lineIds = quote && quote.orderId === live.order.id ? quote.lineIds : [];
    const lines = live.order.lines.map((line) =>
      lineIds.includes(line.id) ? { ...line, paid: true } : line,
    );
    live.order = {
      ...live.order,
      lines,
      paidPesewas: paid,
      paymentStatus: paid >= live.order.totalPesewas ? 'paid' : 'part_paid',
      paymentMethod: row.payment.method === 'card' ? 'online_card' : 'online_momo',
      updatedAt: new Date(clock).toISOString(),
    };
    const loyaltyToken = tokens.loyalty?.() ?? tokens.access();
    const loyalty = loyaltyToken ? world.access.get(loyaltyToken) : undefined;
    const loyaltyPhone =
      loyalty?.purpose === 'guest_loyalty' && isGhanaPhone(loyalty.phone)
        ? ghanaPhone(loyalty.phone)
        : null;
    const momoPhone = isGhanaPhone(row.phone) ? ghanaPhone(row.phone) : null;
    const venue = venueById(world, live.order.venueId);
    // The owner can turn the automatic stamp off and stamp only by scanning.
    if (!world.noAutoStamp.has(venue.id))
      keepLoyalty(
        world,
        venue.id,
        {
          type: 'paid_visit',
          orderId: live.order.id,
          amountMinor: minor(live.order.totalPesewas),
          currency: currencyCode(venue.currency),
          paid: live.order.paymentStatus === 'paid',
          loyaltyPhone,
          momoPhone,
        },
        new Date(clock).toISOString(),
      );
  }
  return row.payment;
}
