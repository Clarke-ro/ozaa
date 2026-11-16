import { OfflineError } from '@/lib/api/errors';
import { createMockClient } from './mockClient';

// The mock stands in for the server until Phase 5, so it must behave like one on a bad network:
// fail while offline, and treat a retried order (same key) as the same order.

function client(online: { value: boolean }) {
  let guest: string | null = null;
  const api = createMockClient({
    tokens: { guest: () => guest, access: () => null },
    isOnline: () => online.value,
  });
  return { api, setGuest: (token: string) => (guest = token) };
}

describe('mock on a bad network', () => {
  it('fails every call while the device is offline', async () => {
    const online = { value: false };
    const { api } = client(online);
    await expect(api.getVenue('mamas-kitchen')).rejects.toBeInstanceOf(OfflineError);
    online.value = true;
    await expect(api.getVenue('mamas-kitchen')).resolves.toMatchObject({ slug: 'mamas-kitchen' });
  });

  it('returns the first order when the same order is sent again', async () => {
    const { api, setGuest } = client({ value: true });
    const dish = (await api.getMenu('mamas-kitchen')).items[0];
    if (!dish) throw new Error('fixture menu is empty');
    setGuest(
      (await api.createGuestSession({ venueSlug: 'mamas-kitchen', tableCode: '4' })).guestToken,
    );
    const body = { clientOrderId: 'retry-1', lines: [{ menuItemId: dish.id, quantity: 1 }] };
    const first = await api.createOrder(body, { idempotencyKey: 'retry-1' });
    const again = await api.createOrder(body, { idempotencyKey: 'retry-1' });
    expect(again.id).toBe(first.id);
  });
});
