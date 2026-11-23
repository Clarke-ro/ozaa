import { randomUUID } from 'node:crypto';
import { parse } from 'yaml';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { businesses, staffMemberships, staffUsers, venues } from '../db/schema.ts';
import type { StaffRole } from '../shared/types.ts';
import { as, KITCHEN, OWNER, ownerSetup, WAITER } from './ownerTestSetup.ts';

/** Every staff role in the contract, least able first (see the grid test for why the order matters). */
export const ROLE_ORDER: readonly StaffRole[] = [
  'staff_scanner',
  'viewer',
  'kitchen',
  'waiter',
  'manager',
  'owner',
];

export type OwnerOp = { method: string; path: string; operationId: string };

/** Every operation in the contract that a signed-in staff member calls (`ownerAuth`). */
export function ownerOperations(): OwnerOp[] {
  const file = fileURLToPath(new URL('../../../api/openapi.yaml', import.meta.url));
  const spec = parse(readFileSync(file, 'utf8')) as {
    paths: Record<
      string,
      Record<string, { operationId?: string; security?: Record<string, unknown>[] }>
    >;
  };
  const ops: OwnerOp[] = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(item)) {
      if (!op?.operationId || !op.security?.some((s) => 'ownerAuth' in s)) continue;
      ops.push({ method: method.toUpperCase(), path, operationId: op.operationId });
    }
  }
  return ops;
}

/**
 * The owner test app plus one member of every role at Mama's Kitchen, an owner of another venue
 * only (Kofi), and one real thing of each kind at Mama's, so a call reaches its role check
 * instead of stopping at "not found".
 */
export async function gridSetup() {
  const world = await ownerSetup();
  const { db, call, mamas } = world;
  const other = (await call('GET', '/me', undefined, as('user_owner', OWNER))).json.venues
    .map((v: { venueId: string }) => v.venueId)
    .find((id: string) => id !== mamas) as string;

  const people: Record<StaffRole, Record<string, string>> = {
    owner: as('user_owner', OWNER),
    waiter: as('user_waiter', WAITER),
    kitchen: as('user_kitchen', KITCHEN),
    manager: as('user_manager', '+233200000004'),
    viewer: as('user_viewer', '+233200000005'),
    staff_scanner: as('user_scanner', '+233200000006'),
  };
  const add = async (id: string, phone: string, venueId: string, role: StaffRole) => {
    await db.insert(staffUsers).values({ id, phone, firstName: role });
    await db
      .insert(staffMemberships)
      .values({ id: `mem_${id}`, venueId, userId: id, role, status: 'invited' });
  };
  await add('usr_manager', '+233200000004', mamas, 'manager');
  await add('usr_viewer', '+233200000005', mamas, 'viewer');
  await add('usr_scanner', '+233200000006', mamas, 'staff_scanner');
  await add('usr_kofi', '+233200000007', other, 'owner');
  // Kofi's venue is his own business: the samples all belong to Ama's, which no real rival would.
  await db.insert(businesses).values({ id: 'biz_kofi', name: "Kofi's" });
  await db.update(venues).set({ businessId: 'biz_kofi' }).where(eq(venues.id, other));
  // Someone for the staff calls to act on, so revoking them doesn't remove the waiter under test.
  await add('usr_spare', '+233200000008', mamas, 'waiter');
  const stranger = as('user_kofi', '+233200000007');
  // Everyone signs in once, so their Clerk id is linked to their staff record.
  for (const headers of [...Object.values(people), stranger])
    await call('GET', '/me', undefined, headers);

  const owner = people.owner;
  const guest = {
    Authorization: `Bearer ${(await call('POST', '/guest-sessions', { venueSlug: 'mamas-kitchen', tableCode: '4' })).json.guestToken}`,
  };
  const menu = (await call('GET', `/owner/venues/${mamas}/menu/categories`, undefined, owner)).json;
  const dish = (await call('GET', '/venues/mamas-kitchen/menu')).json.items[0];
  const order = (
    await call(
      'POST',
      '/orders',
      { clientOrderId: randomUUID(), lines: [{ menuItemId: dish.id, quantity: 1 }] },
      guest,
    )
  ).json;
  const waiterCall = (await call('POST', '/waiter-calls', { reason: 'bill' }, guest)).json;
  await call('POST', '/feedback', { text: 'Lovely jollof', mood: 'happy' }, guest);
  const review = (await call('POST', '/reviews', { stars: 5, orderId: order.id }, guest)).json;
  const feedback = (await call('GET', `/owner/venues/${mamas}/feedback`, undefined, owner)).json
    .items?.[0];
  const table = (await call('GET', `/owner/venues/${mamas}/tables`, undefined, owner)).json
    .items?.[0];
  const link = (
    await call(
      'POST',
      `/owner/venues/${mamas}/links`,
      { title: 'Menu PDF', url: 'https://example.com/m.pdf' },
      owner,
    )
  ).json;
  const device = (
    await call('POST', `/owner/venues/${mamas}/devices/pair`, { name: 'Till' }, owner)
  ).json;
  const business = (await call('GET', '/owner/business', undefined, owner)).json;

  // Real ids for every {param} in a path. A missing one stays a made-up id.
  const ids: Record<string, string | undefined> = {
    venueId: mamas,
    categoryId: menu.items?.[0]?.id ?? menu[0]?.id,
    menuItemId: dish.id,
    tableId: table?.id,
    orderId: order.id,
    waiterCallId: waiterCall.id,
    writtenReviewId: review.id,
    feedbackId: feedback?.id,
    linkId: link.id,
    deviceId: device.device?.id ?? device.id,
    staffId: 'mem_usr_spare',
    locationId: business.locations?.[0]?.id,
  };
  const pathFor = (path: string) =>
    path.replace(/\{(\w+)\}/g, (_, name: string) => ids[name] ?? `${name}_none`);
  return { ...world, people, stranger, ids, pathFor, other };
}
