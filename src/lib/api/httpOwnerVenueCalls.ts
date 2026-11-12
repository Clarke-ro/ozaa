import type { ApiClient } from './client';
import { problem, type HttpContext } from './httpContext';

/** Real-server calls: the owner sets up the venue: details, theme, staff, menu and tables. */
export function httpOwnerVenueCalls({ client, headers, ok }: HttpContext) {
  return {
    ownerGetVenue: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateVenue: (venueId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetTheme: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/theme', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateMediaUpload: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/media', {
          body: body as never,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerGetServices: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/services', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerSetServices: (venueId, body) =>
      ok(
        client.PUT('/owner/venues/{venueId}/services', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerListStaff: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/staff', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerInviteStaff: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/staff', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    async ownerRevokeStaff(venueId, staffId) {
      const result = await client.DELETE('/owner/venues/{venueId}/staff/{staffId}', {
        params: { path: { venueId, staffId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerListCategories: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/menu/categories', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateCategory: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/menu/categories', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateCategory: (venueId, categoryId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/menu/categories/{categoryId}', {
          body,
          params: { path: { venueId, categoryId } },
          headers: headers('access'),
        }),
      ),
    async ownerDeleteCategory(venueId, categoryId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/categories/{categoryId}', {
        params: { path: { venueId, categoryId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerCreateItem: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/menu/items', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerUpdateItem: (venueId, itemId, body) =>
      ok(
        client.PATCH('/owner/venues/{venueId}/menu/items/{menuItemId}', {
          body,
          params: { path: { venueId, menuItemId: itemId } },
          headers: headers('access'),
        }),
      ),
    async ownerDeleteItem(venueId, itemId) {
      const result = await client.DELETE('/owner/venues/{venueId}/menu/items/{menuItemId}', {
        params: { path: { venueId, menuItemId: itemId } },
        headers: headers('access'),
      });
      if (!result.response.ok) throw problem(result.error, result.response.status);
    },
    ownerListTables: (venueId) =>
      ok(
        client.GET('/owner/venues/{venueId}/tables', {
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    ownerCreateTables: (venueId, body) =>
      ok(
        client.POST('/owner/venues/{venueId}/tables', {
          body,
          params: { path: { venueId } },
          headers: headers('access'),
        }),
      ),
    async ownerGetTableQr(venueId, tableId, format) {
      const result = await client.GET('/owner/venues/{venueId}/tables/{tableId}/qr', {
        params: { path: { venueId, tableId }, query: format ? { format } : {} },
        headers: headers('access'),
        parseAs: 'text',
      });
      if (!result.response.ok || result.data === undefined)
        throw problem(result.error, result.response.status);
      return result.data;
    },
  } satisfies Partial<ApiClient>;
}
