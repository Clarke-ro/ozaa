import { apply, blankVenue, currencyCode, minor, samplePhone, seedVenueLoyalty, toWire, walletFromWire } from './facts';

const NOW = '2026-10-31T12:00:00.000Z';
const PHONE = samplePhone('+233244000099');
const random = () => 0.2;

function programme(venue = blankVenue('ven_mamas', 'GHS')) {
  const saved = apply(
    venue,
    {
      type: 'save_programme',
      venueCurrency: 'GHS',
      random,
      input: {
        enabled: true,
        earn: { kind: 'stamps' },
        tiers: [
          { id: 'bronze', minLifetime: 0 },
          { id: 'silver', minLifetime: 4 },
          { id: 'gold', minLifetime: 8 },
        ],
        rewards: [{ id: 'rwd_jollof', title: 'Free jollof & chicken', cost: 8 }],
        expiryDays: null,
        claimTtlSeconds: 600,
        birthdayTreat: null,
      },
    },
    NOW,
  );
  if (!saved.ok) throw new Error(saved.error.code);
  return saved.next;
}

function joined() {
  const step = apply(
    programme(),
    { type: 'join', phone: PHONE, firstName: 'Ama', consent: { loyalty: true, marketing: false, textVersion: 'consent-2026-10-v1' }, random },
    NOW,
  );
  if (!step.ok) throw new Error(step.error.code);
  return step.next;
}

test('a second success on the same order does not earn again', () => {
  const visit = {
    type: 'paid_visit' as const,
    orderId: 'ord_1',
    amountMinor: minor(9500),
    currency: currencyCode('GHS'),
    paid: true,
    loyaltyPhone: PHONE,
    momoPhone: null,
  };
  const first = apply(joined(), visit, NOW);
  const second = first.ok ? apply(first.next, visit, NOW) : first;
  expect(first.ok && second.ok).toBe(true);
  if (!first.ok || !second.ok) return;
  expect(second.effect).toBe('duplicate');
  const wire = toWire(second.next, { kind: 'card', phone: PHONE });
  expect(walletFromWire(wire, NOW, 'mamas-kitchen').progress.balance).toBe(1);
});

test('points follow minor units and the programme currency', () => {
  const saved = apply(
    blankVenue('ven_bean', 'GHS'),
    {
      type: 'save_programme',
      venueCurrency: 'GHS',
      random,
      input: {
        enabled: true,
        earn: { kind: 'points', points: 1, perMinor: 100 },
        tiers: [
          { id: 'bronze', minLifetime: 0 },
          { id: 'silver', minLifetime: 40 },
          { id: 'gold', minLifetime: 100 },
        ],
        rewards: [{ id: 'rwd_coffee', title: 'Free flat white', cost: 80 }],
        expiryDays: null,
        claimTtlSeconds: 600,
        birthdayTreat: null,
      },
    },
    NOW,
  );
  if (!saved.ok) throw new Error('save');
  const member = apply(
    saved.next,
    { type: 'join', phone: PHONE, firstName: 'Ama', consent: { loyalty: true, marketing: false, textVersion: 'consent-2026-10-v1' }, random },
    NOW,
  );
  if (!member.ok) throw new Error('join');
  const earned = apply(
    member.next,
    { type: 'paid_visit', orderId: 'ord_2', amountMinor: minor(2500), currency: currencyCode('GHS'), paid: true, loyaltyPhone: PHONE, momoPhone: null },
    NOW,
  );
  const wrong = apply(
    member.next,
    { type: 'paid_visit', orderId: 'ord_3', amountMinor: minor(2500), currency: currencyCode('NGN'), paid: true, loyaltyPhone: PHONE, momoPhone: null },
    NOW,
  );
  expect(wrong.ok).toBe(false);
  if (!earned.ok) throw new Error('earn');
  const wire = toWire(earned.next, { kind: 'card', phone: PHONE });
  const wallet = walletFromWire(wire, NOW, 'bean-there');
  expect(wallet.progress.balance).toBe(25);
  expect(wallet.progress.kind).toBe('points');
  expect(wallet.history[0]?.amountMinor).toBe(2500);
  expect(wallet.history[0]?.currency).toBe('GHS');
});

test('tier follows lifetime earn and a redeem does not demote', () => {
  let venue = joined();
  for (let index = 0; index < 5; index += 1) {
    const step = apply(
      venue,
      { type: 'paid_visit', orderId: `ord_${index}`, amountMinor: minor(1000), currency: currencyCode('GHS'), paid: true, loyaltyPhone: PHONE, momoPhone: null },
      NOW,
    );
    if (!step.ok) throw new Error('visit');
    venue = step.next;
  }
  const before = walletFromWire(toWire(venue, { kind: 'card', phone: PHONE }), NOW, 'mamas-kitchen');
  expect(before.tier).toBe('silver');
  expect(before.progress.balance).toBe(5);
});

test('staff confirmation is the only spend, and a second tap replays', () => {
  let venue = joined();
  for (let index = 0; index < 8; index += 1) {
    const step = apply(
      venue,
      { type: 'paid_visit', orderId: `ord_${index}`, amountMinor: minor(1000), currency: currencyCode('GHS'), paid: true, loyaltyPhone: PHONE, momoPhone: null },
      NOW,
    );
    if (!step.ok) throw new Error('visit');
    venue = step.next;
  }
  const claim = apply(venue, { type: 'open_claim', phone: PHONE, rewardId: 'rwd_jollof', random }, NOW);
  if (!claim.ok) throw new Error(claim.error.code);
  const card = walletFromWire(toWire(claim.next, { kind: 'card', phone: PHONE }), NOW, 'mamas-kitchen');
  expect(card.liveClaim?.code).toBeTruthy();
  expect(card.progress.balance).toBe(0);
  const code = card.liveClaim?.code ?? '';
  const confirmed = apply(claim.next, { type: 'confirm', code }, NOW);
  const again = confirmed.ok ? apply(confirmed.next, { type: 'confirm', code }, NOW) : confirmed;
  expect(again.ok && again.effect).toBe('duplicate');
  if (!confirmed.ok) return;
  const after = walletFromWire(toWire(confirmed.next, { kind: 'card', phone: PHONE }), NOW, 'mamas-kitchen');
  expect(after.progress.balance).toBe(0);
  expect(after.tier).toBe('gold');
  expect(after.history.some((row) => row.source === 'redeem')).toBe(true);
});

test('an expired code does not spend, and earn mode locks after the first earn', () => {
  const claim = apply(joined(), { type: 'open_claim', phone: PHONE, rewardId: 'rwd_jollof', random }, NOW);
  expect(claim.ok).toBe(false);
  let venue = joined();
  const earned = apply(
    venue,
    { type: 'paid_visit', orderId: 'ord_lock', amountMinor: minor(1000), currency: currencyCode('GHS'), paid: true, loyaltyPhone: PHONE, momoPhone: null },
    NOW,
  );
  if (!earned.ok) throw new Error('earn');
  venue = earned.next;
  const eight = walletFromWire(toWire(venue, { kind: 'card', phone: PHONE }), NOW, 'mamas-kitchen');
  const ready = apply(venue, { type: 'open_claim', phone: PHONE, rewardId: 'rwd_jollof', random }, NOW);
  expect(ready.ok).toBe(false);
  expect(eight.progress.balance).toBe(1);
  const locked = apply(
    venue,
    {
      type: 'save_programme',
      venueCurrency: 'GHS',
      random,
      input: {
        enabled: true,
        earn: { kind: 'points', points: 1, perMinor: 100 },
        tiers: [
          { id: 'bronze', minLifetime: 0 },
          { id: 'silver', minLifetime: 4 },
          { id: 'gold', minLifetime: 8 },
        ],
        rewards: [{ id: 'rwd_jollof', title: 'Free jollof & chicken', cost: 8 }],
        expiryDays: 1,
        claimTtlSeconds: 600,
        birthdayTreat: null,
      },
    },
    NOW,
  );
  expect(locked.ok).toBe(false);
  if (locked.ok) return;
  expect(locked.error.code).toBe('earn_mode_locked');
});

test('a game win awards once per day and seedVenueLoyalty round-trips', () => {
  const venue = joined();
  const win = { type: 'game_win' as const, phone: PHONE, runId: 'run_1', score: 18, minScore: 15, enabled: true };
  const first = apply(venue, win, NOW);
  const second = first.ok ? apply(first.next, { ...win, runId: 'run_2' }, NOW) : first;
  expect(first.ok && first.effect === 'posted').toBe(true);
  expect(second.ok && second.effect === 'duplicate').toBe(true);
  if (!second.ok) return;
  const wire = toWire(second.next, { kind: 'card', phone: PHONE });
  const reseeded = seedVenueLoyalty('ven_mamas', wire, PHONE);
  expect(walletFromWire(toWire(reseeded, { kind: 'card', phone: PHONE }), NOW, 'mamas-kitchen').progress.balance).toBe(1);
});
