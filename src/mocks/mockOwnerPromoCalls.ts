import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import type { Promo, PromoInput } from '@/lib/api/types';
import { promoState } from '@/lib/promos';
import { nextId, venueById } from './world';
import { staffRole } from './mockRules';
import type { MockContext } from './mockContext';
import type { World } from './worldTypes';

/** The checks the server makes before it keeps a promo. Throws 422 with the field to fix. */
function checkPromo(world: World, venueId: string, input: PromoInput, selfId?: string) {
  const bad = (code: string) => {
    throw new ApiError(422, code, 'Check this promo');
  };
  if (input.kind === 'percent_off' && !input.percent) bad('promo_percent_missing');
  if (input.kind === 'amount_off' && !input.amountPesewas) bad('promo_amount_missing');
  if (input.kind === 'free_item') {
    const menu = world.menus[venueById(world, venueId).slug];
    if (!menu?.items.some((item) => item.id === input.freeItemId)) bad('promo_item_missing');
  }
  if (input.appliesTo === 'category' && !input.categoryId) bad('promo_section_missing');
  if (input.startsAt && input.endsAt && input.endsAt <= input.startsAt) bad('promo_dates');
  if (Boolean(input.startTime) !== Boolean(input.endTime)) bad('promo_hours');
  if (
    input.code &&
    world.promos.some((p) => p.venueId === venueId && p.code === input.code && p.id !== selfId)
  ) {
    throw new ApiError(409, 'promo_code_taken', 'Another promo already uses this code');
  }
}

/** Mock calls: promos, kept per venue. Owners and managers change them; anyone signed in reads. */
export function mockOwnerPromoCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;
  const canEdit = () => {
    const role = staffRole(world, tokens);
    if (role !== 'owner' && role !== 'manager')
      throw new ApiError(403, 'forbidden', 'Only owners and managers can change promos');
  };
  const view = ({ venueId: _venue, ...promo }: Promo & { venueId: string }): Promo => ({
    ...promo,
    state: promoState(promo, now()),
  });
  const find = (venueId: string, promoId: string) => {
    const promo = world.promos.find((p) => p.venueId === venueId && p.id === promoId);
    if (!promo) throw new ApiError(404, 'not_found', 'That promo was deleted');
    return promo;
  };
  return {
    async ownerListPromos(venueId) {
      await gate();
      staffRole(world, tokens);
      venueById(world, venueId);
      const items = world.promos
        .filter((promo) => promo.venueId === venueId)
        .map(view)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { items };
    },
    async ownerCreatePromo(venueId, body) {
      await gate();
      canEdit();
      checkPromo(world, venueId, body);
      const row = {
        ...body,
        appliesTo: body.appliesTo ?? 'order',
        days: body.days ?? [],
        id: nextId(world, 'prm'),
        venueId,
        state: 'off' as const,
        usageCount: 0,
        discountGivenPesewas: 0,
        createdAt: new Date(now()).toISOString(),
      };
      world.promos.push(row);
      return view(row);
    },
    async ownerUpdatePromo(venueId, promoId, body) {
      await gate();
      canEdit();
      const promo = find(venueId, promoId);
      const next = { ...promo, ...body };
      checkPromo(world, venueId, next, promoId);
      Object.assign(promo, body);
      return view(promo);
    },
    async ownerDeletePromo(venueId, promoId) {
      await gate();
      canEdit();
      find(venueId, promoId);
      world.promos = world.promos.filter((p) => !(p.venueId === venueId && p.id === promoId));
    },
  } satisfies Partial<ApiClient>;
}
