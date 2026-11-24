import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: where the menu is published (table, online, Chowdeck), and the add-on library. */
export function httpOwnerChannelCalls({ client, headers, ok }: HttpContext) {
  return {
    ownerListChannels: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/channels', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateChannel: (venueId, channel, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/channels/{channel}', {
          body,
          params: { path: { venueId, channel } },
          headers: headers('access'),
        }),
      ),
    ownerPublishChannel: (venueId, channel) =>
      ok(
        client.POST('/owner/venues/{venueId}/channels/{channel}/publish', {
          params: { path: { venueId, channel } },
          headers: headers('access'),
        }),
      ),
    ownerConnectChowdeck: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/channels/chowdeck/keys', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerDisconnectChowdeck: (venueId) =>
      ok(
        client.DELETE('/owner/venues/{venueId}/channels/chowdeck/keys', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateModifierGroup: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/menu/modifier-groups', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateModifierGroup: (venueId, groupId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/menu/modifier-groups/{groupId}', {
          body,
          params: { path: { venueId, groupId } },
          headers: headers('access'),
        }),
      ),
    // 204 has no body, so this checks the status itself, like ownerDeleteItem.
    async ownerDeleteModifierGroup(venueId, groupId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/modifier-groups/{groupId}', {
        params: { path: { venueId, groupId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
  } satisfies Partial<ApiClient>;
}
