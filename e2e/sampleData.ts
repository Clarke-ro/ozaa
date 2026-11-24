import { randomUUID } from 'node:crypto';
import { expect, type APIRequestContext } from '@playwright/test';
import { REAL_SERVER } from './signIn';

/**
 * Things the mock already has in its sample data (src/mocks/seedOwnerDesk.ts) that a test on the
 * real server makes for itself, the way a guest would: through the same API calls the app makes.
 * Against the mock these do nothing, so a test reads the same either way.
 */
const API = 'http://127.0.0.1:4000/v1';

async function guestAt(request: APIRequestContext, venueSlug: string, tableCode: string) {
  const res = await request.post(`${API}/guest-sessions`, { data: { venueSlug, tableCode } });
  expect(res.ok(), `guest session at ${venueSlug} table ${tableCode}`).toBeTruthy();
  const { guestToken } = (await res.json()) as { guestToken: string };
  return { Authorization: `Bearer ${guestToken}` };
}

/** A guest at this table calls a waiter (the mock's sample: table 4 at Mama's, for water). */
export async function callWaiter(
  request: APIRequestContext,
  venueSlug: string,
  tableCode: string,
): Promise<void> {
  if (!REAL_SERVER) return;
  const headers = await guestAt(request, venueSlug, tableCode);
  const res = await request.post(`${API}/waiter-calls`, { headers, data: { reason: 'water' } });
  expect(res.ok(), 'waiter call').toBeTruthy();
}

/**
 * A guest at this table orders one of the first dish, so the kitchen has a new ticket. `note` is
 * the guest's instructions for the whole order (the mock's sample: table 5 at Mama's).
 */
export async function placeOrder(
  request: APIRequestContext,
  venueSlug: string,
  tableCode: string,
  note?: string,
): Promise<void> {
  if (!REAL_SERVER) return;
  const headers = await guestAt(request, venueSlug, tableCode);
  const menu = (await (await request.get(`${API}/venues/${venueSlug}/menu`)).json()) as {
    items: { id: string }[];
  };
  const dish = menu.items[0];
  expect(dish, `a dish on ${venueSlug}'s menu`).toBeTruthy();
  const res = await request.post(`${API}/orders`, {
    headers,
    data: { clientOrderId: randomUUID(), lines: [{ menuItemId: dish!.id, quantity: 1 }], note },
  });
  expect(res.ok(), 'order').toBeTruthy();
}
