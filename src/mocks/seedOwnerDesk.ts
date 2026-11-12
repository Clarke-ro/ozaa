import type { World } from './worldTypes';

/** Sample owner-desk data for Mama's Kitchen, so the owner screens aren't empty. */
export function seedOwnerDesk(world: World, now: number): void {
  const mama = world.venues['mamas-kitchen'];
  if (!mama) return;
  world.seatedCodes[mama.id] = ['7'];

  // Seed feedback
  world.feedback.push(
    {
      id: 'fbk_1',
      venueId: mama.id,
      sentiment: 'positive',
      score: 5,
      text: 'The grilled tilapia and hot pepper was incredible! Best in Osu.',
      photoUrl: null,
      contactName: 'Kofi Mensah',
      contactPhone: '+233241234567',
      archived: false,
      visibleAfter: new Date(now - 12 * 3600_000).toISOString(),
      createdAt: new Date(now - 14 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_2',
      venueId: mama.id,
      sentiment: 'neutral',
      score: 3,
      text: 'Food took about 25 minutes to arrive on a busy Friday night.',
      photoUrl: null,
      contactName: null,
      contactPhone: null,
      archived: false,
      visibleAfter: new Date(now - 3 * 3600_000).toISOString(),
      createdAt: new Date(now - 5 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_3',
      venueId: mama.id,
      sentiment: 'negative',
      score: 2,
      text: 'The kelewele was a bit too salty and we waited long for the bill.',
      photoUrl: null,
      contactName: 'Esi Boateng',
      contactPhone: '+233209876543',
      archived: false,
      visibleAfter: new Date(now - 1 * 3600_000).toISOString(),
      createdAt: new Date(now - 2 * 3600_000).toISOString(),
    },
    {
      id: 'fbk_4',
      venueId: mama.id,
      sentiment: 'negative',
      score: 1,
      text: 'Recent feedback test note that is still held in anonymity delay window.',
      photoUrl: null,
      contactName: null,
      contactPhone: null,
      archived: false,
      visibleAfter: new Date(now + 4 * 3600_000).toISOString(),
      createdAt: new Date(now - 30 * 60_000).toISOString(),
    },
  );

  // Seed custom links
  world.customLinks.push(
    {
      id: 'lnk_1',
      venueId: mama.id,
      title: 'Reserve Weekend Table',
      url: 'https://mamas.kitchen/reserve',
      icon: 'calendar',
      placement: 'button',
      startDate: null,
      endDate: null,
      sortOrder: 1,
      clicks: 42,
      enabled: true,
    },
    {
      id: 'lnk_2',
      venueId: mama.id,
      title: 'Follow our Instagram',
      url: 'https://instagram.com/mamas_kitchen_gh',
      icon: 'instagram',
      placement: 'button',
      startDate: null,
      endDate: null,
      sortOrder: 2,
      clicks: 128,
      enabled: true,
    },
  );

  // Seed paired scanner device
  world.devices.push({
    id: 'dev_ipad1',
    venueId: mama.id,
    name: 'Floor iPad Pro (Register)',
    platform: 'iOS 18.2',
    pairedAt: new Date(now - 7 * 86400_000).toISOString(),
    lastSeen: new Date(now - 10 * 60_000).toISOString(),
    pairingCode: null,
  });
  world.calls.push({
    id: 'wcl_mamas4',
    venueId: mama.id,
    tableCode: '4',
    reason: 'water',
    status: 'open',
    staffFirstName: null,
    createdAt: new Date(now - 4 * 60_000).toISOString(),
  });
  world.orders.push({
    manual: true,
    receivedAt: now,
    order: {
      id: 'ord_mamasbill',
      number: 18,
      venueId: mama.id,
      tableCode: '3',
      status: 'served',
      paymentStatus: 'unpaid',
      lines: [
        {
          id: 'oln_bill',
          menuItemId: 'itm_mamas0',
          name: 'Jollof & chicken',
          quantity: 1,
          modifiers: [],
          unitPricePesewas: 4500,
          totalPesewas: 4500,
          paid: false,
        },
      ],
      subtotalPesewas: 4500,
      taxes: [],
      totalPesewas: 4500,
      paidPesewas: 0,
      etaMinutes: null,
      createdAt: new Date(now - 40 * 60_000).toISOString(),
      updatedAt: new Date(now - 15 * 60_000).toISOString(),
      readyAt: new Date(now - 20 * 60_000).toISOString(),
    },
  });
  const paid = world.orders.filter(
    (item) => item.order.venueId === mama.id && item.order.paymentStatus === 'paid',
  );
  const methods = ['momo', 'card', 'cash'] as const;
  paid.forEach((item, index) => {
    const method = methods[index % methods.length] ?? 'momo';
    world.transactions.push({
      id: `txn_mama${index}`,
      venueId: mama.id,
      reference: `ref_mama${index}`,
      orderId: item.order.id,
      orderNumber: item.order.number,
      method,
      provider: method === 'momo' ? 'mtn' : undefined,
      amountPesewas: item.order.paidPesewas,
      currency: 'GHS',
      status: 'succeeded',
      settlement: index === 0 ? 'pending' : 'settled',
      createdAt: item.order.createdAt,
      testMode: true,
    });
  });
  world.written.push(
    {
      id: 'rev_mamas1',
      venueId: mama.id,
      stars: 5,
      firstName: 'Efua',
      text: 'The waakye was hot and the shito was perfect.',
      highlights: ['food'],
      createdAt: new Date(now - 2 * 60 * 60_000).toISOString(),
      reply: null,
    },
    {
      id: 'rev_mamas2',
      venueId: mama.id,
      stars: 2,
      firstName: 'Kojo',
      text: 'We waited a long time for the bill.',
      highlights: ['speed'],
      createdAt: new Date(now - 5 * 60 * 60_000).toISOString(),
      reply: null,
    },
  );
}
