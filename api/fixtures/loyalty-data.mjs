// Sample loyalty cards (programme + member) for build-fixtures.mjs, keyed by prototype venue key.
// The prototype only has a simple stamp count, so this richer data is written by hand.
// Shaped like LoyaltyCard in api/openapi.yaml.

// Every sample member signed up on the same day and saw the same consent text (Act 843:
// consent is stored with its text version; marketing is separate and off).
const memberSince = '2026-03-14';
const consent = { marketing: false, at: '2026-03-14T18:02:00Z', textVersion: 'consent-2026-10-v1' };

// One earn fact for a paid visit. amountMinor is in pesewas.
const visit = (id, at, units, amountMinor) => ({
  kind: 'earn', id: `ern_${id}`, at, units,
  source: { type: 'paid_visit', orderId: id, amountMinor, currency: 'GHS' },
});

export const LOYALTY = {
  mamas: {
    programme: {
      enabled: true,
      currency: 'GHS',
      earn: { kind: 'stamps' },
      tiers: [
        { id: 'bronze', minLifetime: 0 },
        { id: 'silver', minLifetime: 4 },
        { id: 'gold', minLifetime: 8 },
      ],
      rewards: [
        { id: 'rwd_sobolo', title: 'Free chilled sobolo', cost: 4 },
        { id: 'rwd_mamas', title: 'Free jollof & chicken', cost: 8 },
      ],
      expiryDays: 90,
      claimTtlSeconds: 600,
      birthdayTreat: 'Free kelewele on your birthday',
      memberCount: 1,
    },
    member: {
      id: 'mem_mamas', firstName: 'Ama', phoneMasked: '024 *** 0099', birthdayMonthDay: '08-14',
      memberSince, consent,
      facts: [
        visit('ord_m1', '2026-10-12T13:15:00Z', 1, 8500),
        visit('ord_m2', '2026-10-18T19:40:00Z', 1, 12000),
        {
          kind: 'earn', id: 'ern_game_m1', at: '2026-10-21T14:05:00Z', units: 1,
          source: { type: 'game', runId: 'run_m1', day: '2026-10-21' },
        },
        visit('ord_m3', '2026-10-25T20:10:00Z', 1, 9500),
        visit('ord_m4', '2026-10-29T18:30:00Z', 1, 14300),
      ],
    },
  },
  bean: {
    programme: {
      enabled: true,
      currency: 'GHS',
      // 1 point per GH₵1 spent (100 pesewas).
      earn: { kind: 'points', points: 1, perMinor: 100 },
      tiers: [
        { id: 'bronze', minLifetime: 0 },
        { id: 'silver', minLifetime: 40 },
        { id: 'gold', minLifetime: 100 },
      ],
      rewards: [
        { id: 'rwd_espresso', title: 'Free double espresso', cost: 40 },
        { id: 'rwd_bean', title: 'Free flat white', cost: 80 },
      ],
      expiryDays: 180,
      claimTtlSeconds: 600,
      birthdayTreat: 'Free cinnamon roll on your birthday',
      memberCount: 1,
    },
    member: {
      id: 'mem_bean', firstName: 'Ama', phoneMasked: '020 *** 0099', birthdayMonthDay: '08-14',
      memberSince, consent,
      facts: [
        visit('ord_b1', '2026-10-20T09:30:00Z', 30, 3000),
        visit('ord_b2', '2026-10-28T10:15:00Z', 25, 2500),
      ],
    },
  },
  akos: {
    programme: {
      enabled: true,
      currency: 'GHS',
      earn: { kind: 'stamps' },
      tiers: [
        { id: 'bronze', minLifetime: 0 },
        { id: 'silver', minLifetime: 3 },
        { id: 'gold', minLifetime: 6 },
      ],
      rewards: [{ id: 'rwd_akos', title: 'Free fufu & light soup', cost: 6 }],
      expiryDays: null,
      claimTtlSeconds: 600,
      birthdayTreat: null,
      memberCount: 1,
    },
    member: {
      id: 'mem_akos', firstName: 'Ama', phoneMasked: '027 *** 0099', birthdayMonthDay: null,
      memberSince, consent,
      facts: [
        visit('ord_a1', '2026-10-15T13:00:00Z', 1, 6500),
        visit('ord_a2', '2026-10-27T14:20:00Z', 1, 7000),
      ],
    },
  },
};
