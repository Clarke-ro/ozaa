import { signedInMock } from './testOwner';

const happyHour = {
  name: 'Happy hour',
  kind: 'percent_off' as const,
  percent: 20,
  channel: 'all' as const,
  enabled: true,
};

test('a running promo comes off the bill the server works out, and counts its use', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const promo = await api.ownerCreatePromo(id, happyHour);
  expect(promo.state).toBe('running');
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const order = await api.ownerCreateOrder(
    id,
    {
      clientOrderId: crypto.randomUUID(),
      lines: [{ menuItemId: dish.id, quantity: 1 }],
      tableCode: '3',
    },
    { idempotencyKey: 'promo-1' },
  );
  const unit = dish.salePricePesewas ?? dish.pricePesewas;
  expect(order.promoDiscounts).toEqual([
    { promoId: promo.id, name: 'Happy hour', pesewas: Math.floor(unit * 0.2) },
  ]);
  expect(order.totalPesewas).toBe(unit - Math.floor(unit * 0.2));
  const [listed] = (await api.ownerListPromos(id)).items;
  expect(listed?.usageCount).toBe(1);
});

test('switched off, it stops applying; a wrong code is refused', async () => {
  const { api } = await signedInMock();
  const { id } = await api.getVenue('mamas-kitchen');
  const promo = await api.ownerCreatePromo(id, { ...happyHour, code: 'TESTCODE10' });
  const dish = (await api.getMenu('mamas-kitchen')).items[0]!;
  const place = (promoCode: string | undefined, key: string) =>
    api.ownerCreateOrder(
      id,
      {
        clientOrderId: crypto.randomUUID(),
        lines: [{ menuItemId: dish.id, quantity: 1 }],
        promoCode,
      },
      { idempotencyKey: key },
    );
  await expect(place('NOPE', 'k1')).rejects.toMatchObject({ code: 'promo_not_valid' });
  expect((await place('TESTCODE10', 'k2')).promoDiscounts).toHaveLength(1);
  await api.ownerUpdatePromo(id, promo.id, { enabled: false });
  await expect(place('TESTCODE10', 'k3')).rejects.toMatchObject({ code: 'promo_not_valid' });
  expect((await api.ownerListPromos(id)).items[0]?.state).toBe('off');
});

test('waiters cannot change promos; codes are unique per venue', async () => {
  const waiter = await signedInMock(Date.now(), '+233240000002');
  const { id } = await waiter.api.getVenue('mamas-kitchen');
  await expect(waiter.api.ownerCreatePromo(id, happyHour)).rejects.toMatchObject({ status: 403 });
  const { api } = await signedInMock();
  await api.ownerCreatePromo(id, { ...happyHour, code: 'ONE' });
  await expect(api.ownerCreatePromo(id, { ...happyHour, code: 'ONE' })).rejects.toMatchObject({
    status: 409,
  });
});
