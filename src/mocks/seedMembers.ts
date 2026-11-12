import { apply, minor, samplePhone } from '../features/loyalty/facts';
import type { World } from './worldTypes';

// Sample members for the demo venue. Each one's visits are real paid orders from seedHistory,
// so Customers, Loyalty and Sales all count the same visits.
const MEMBERS = [
  ['Kofi', 14, true],
  ['Abena', 9, true],
  ['Kwame', 7, false],
  ['Efua', 5, true],
  ['Adwoa', 3, false],
  ['Kojo', 2, true],
  ['Akua', 1, false],
  ['Esi', 1, true],
] as const;

export function seedMembers(world: World): void {
  const venue = world.venues['mamas-kitchen'];
  const loyalty = venue ? world.loyalty[venue.id] : undefined;
  if (!venue || !loyalty) return;
  // Oldest paid orders first, so a member's first visit is their earliest order.
  const history = world.orders
    .filter((row) => row.order.venueId === venue.id && row.order.id.startsWith('ord_h'))
    .sort((a, b) => a.order.createdAt.localeCompare(b.order.createdAt));
  let current = loyalty;
  let cursor = 0;
  MEMBERS.forEach(([firstName, visits, marketing], index) => {
    const phone = samplePhone(`+2332410000${String(index + 10).padStart(2, '0')}`);
    // Spread each member's visits over the month; quiet members stopped coming a while ago.
    const picks = history
      .filter((_, i) => (i + index * 3) % Math.max(1, Math.floor(history.length / visits)) === 0)
      .slice(0, visits);
    const joinedAt = picks[0]?.order.createdAt ?? history[cursor]?.order.createdAt;
    if (!joinedAt) return;
    let step = apply(
      current,
      {
        type: 'join',
        phone,
        firstName,
        consent: { loyalty: true, marketing, textVersion: 'consent-2026-10-v1' },
        random: () => (index + 1) / 10,
      },
      joinedAt,
    );
    if (!step.ok) return;
    current = step.next;
    for (const row of picks) {
      step = apply(
        current,
        {
          type: 'paid_visit',
          orderId: row.order.id,
          amountMinor: minor(row.order.totalPesewas),
          currency: current.programme.currency,
          paid: true,
          loyaltyPhone: phone,
          momoPhone: null,
        },
        row.order.createdAt,
      );
      if (step.ok) current = step.next;
    }
    cursor += visits;
  });
  world.loyalty[venue.id] = current;
}
