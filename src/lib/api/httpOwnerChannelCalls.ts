import type { ApiClient } from './client';
import type { HttpContext } from './httpContext';

/** Real-server calls: where the menu is published (table, online, Chowdeck). */
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
  } satisfies Partial<ApiClient>;
}
