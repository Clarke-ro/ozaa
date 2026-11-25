import type { ApiClient } from '@/lib/api/client';
import type { ChannelKind } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import {
  channelList,
  checkChannelPatch,
  emptyChowdeck,
  startPublish,
  webhookUrlFor,
  type ChowdeckState,
} from '@/lib/channels';
import { env } from '@/lib/env';
import { channelMenu } from '@/lib/channelMenu';
import { resolveMenu } from '@/lib/addOns';
import { keyHint } from '@/lib/payments';
import { venueById } from './world';
import { staffRole } from './mockRules';
import type { MockContext } from './mockContext';

/**
 * Mock calls: where the menu is published. Publishing is `pending` at first. So the owner screens
 * can be tried, the mock then acts as the connector will (BUILD.md 5b.11): after 3 s the send is
 * `synced`, with a problem for each dish Chowdeck can't take (channelMenu). The real server
 * stays `pending` until the connector exists.
 */
const SEND_MS = 3_000;
export function mockOwnerChannelCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;

  const stateOf = (venueId: string): ChowdeckState => {
    const state = world.chowdeck[venueId] ?? emptyChowdeck();
    const since = state.sync.at ? Date.parse(state.sync.at) : 0;
    if (state.sync.state !== 'pending' || now() - since < SEND_MS) return state;
    const menu = world.menus[venueById(world, venueId).slug];
    if (!menu) return state;
    const sent = channelMenu(resolveMenu(menu), state, now());
    const done: ChowdeckState = {
      ...state,
      sync: {
        state: 'synced',
        at: new Date(now()).toISOString(),
        menuUpdatedAt: menu.updatedAt,
        problems: sent.problems,
      },
    };
    world.chowdeck[venueId] = done;
    return done;
  };
  const listFor = (venueId: string) =>
    channelList({
      onlineEnabled: venueById(world, venueId).onlineOrdering?.enabled ?? false,
      chowdeck: stateOf(venueId),
    });
  const chowdeckOf = (venueId: string) => listFor(venueId)[2]!;
  const known = (kind: string): kind is ChannelKind =>
    kind === 'table' || kind === 'online' || kind === 'chowdeck';
  // The keys are the owner's business, like the Paystack keys.
  const ownerOnly = () => {
    if (staffRole(world, tokens) !== 'owner')
      throw new ApiError(403, 'forbidden', 'Only the owner can change the Chowdeck keys');
  };

  return {
    async ownerListChannels(venueId) {
      await gate();
      return { channels: listFor(venueId) };
    },
    async ownerUpdateChannel(venueId, channel, body) {
      await gate();
      if (!known(channel)) throw new ApiError(404, 'not_found', 'No such channel');
      const current = stateOf(venueId);
      const refused = checkChannelPatch(channel, body, current);
      if (refused) throw new ApiError(refused.status, refused.code, refused.message);
      world.chowdeck[venueId] = {
        ...current,
        ...(body.enabled === undefined ? {} : { enabled: body.enabled }),
        ...(body.priceRule ? { priceRule: body.priceRule } : {}),
        ...(body.hiddenItemIds ? { hiddenItemIds: [...new Set(body.hiddenItemIds)] } : {}),
      };
      return chowdeckOf(venueId);
    },
    async ownerPublishChannel(venueId, channel) {
      await gate();
      if (!known(channel)) throw new ApiError(404, 'not_found', 'No such channel');
      const current = stateOf(venueId);
      const result = startPublish(channel, current, now());
      if (!result.ok) throw new ApiError(result.status, result.code, result.message);
      world.chowdeck[venueId] = { ...current, sync: result.sync };
      return chowdeckOf(venueId);
    },
    async ownerConnectChowdeck(venueId, body) {
      await gate();
      ownerOnly();
      // The real server stores the keys sealed. The mock keeps only what the app may see.
      world.chowdeck[venueId] = {
        ...stateOf(venueId),
        connection: {
          mode: 'test',
          merchantReference: body.merchantReference.trim(),
          secretKeyHint: keyHint(body.secretKey),
          webhookUrl: webhookUrlFor(env.EXPO_PUBLIC_API_URL),
          connectedAt: new Date(now()).toISOString(),
        },
      };
      return chowdeckOf(venueId);
    },
    async ownerDisconnectChowdeck(venueId) {
      await gate();
      ownerOnly();
      // Without keys the channel can't stay on.
      world.chowdeck[venueId] = { ...stateOf(venueId), enabled: false, connection: null };
      return chowdeckOf(venueId);
    },
  } satisfies Partial<ApiClient>;
}
