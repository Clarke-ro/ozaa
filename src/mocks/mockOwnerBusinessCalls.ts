import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { nextId } from './world';
import type { MockContext } from './mockContext';

/** Mock calls: the business behind the venues: custom links, locations and scanner devices. */
export function mockOwnerBusinessCalls(ctx: MockContext) {
  const { world, now, gate } = ctx;
  return {
    async ownerListCustomLinks(venueId) {
      await gate();
      return {
        items: (world.customLinks ?? [])
          .filter((l) => l.venueId === venueId)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    },
    async ownerCreateCustomLink(venueId, body) {
      await gate();
      const link = {
        id: nextId(world, 'lnk'),
        venueId,
        title: body.title,
        url: body.url,
        icon: body.icon ?? 'globe',
        placement: body.placement ?? 'button',
        startDate: body.startDate ?? null,
        endDate: body.endDate ?? null,
        sortOrder: body.sortOrder ?? (world.customLinks?.length ?? 0) + 1,
        clicks: 0,
        enabled: body.enabled ?? true,
      };
      world.customLinks.push(link);
      return link;
    },
    async ownerUpdateCustomLink(venueId, linkId, body) {
      await gate();
      const link = (world.customLinks ?? []).find((l) => l.id === linkId);
      if (!link) throw new ApiError(404, 'not_found', 'Custom link not found');
      if (body.title !== undefined) link.title = body.title;
      if (body.url !== undefined) link.url = body.url;
      if (body.icon !== undefined) link.icon = body.icon;
      if (body.placement !== undefined) link.placement = body.placement;
      if (body.startDate !== undefined) link.startDate = body.startDate;
      if (body.endDate !== undefined) link.endDate = body.endDate;
      if (body.sortOrder !== undefined) link.sortOrder = body.sortOrder;
      if (body.enabled !== undefined) link.enabled = body.enabled;
      return link;
    },
    async ownerDeleteCustomLink(venueId, linkId) {
      await gate();
      world.customLinks = (world.customLinks ?? []).filter((l) => l.id !== linkId);
    },
    async ownerGetBusiness() {
      await gate();
      return world.business;
    },
    async ownerUpdateBusiness(body) {
      await gate();
      world.business.business.name = body.name;
      return world.business.business;
    },
    async ownerCreateLocation(body) {
      await gate();
      const loc = {
        id: nextId(world, 'ven'),
        businessId: world.business.business.id,
        slug: body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        name: body.name,
        email: null,
        phone: null,
        address1: body.address1 ?? null,
        address2: null,
        city: body.city ?? null,
        postcode: body.postcode ?? null,
        country: body.country,
        currency: 'GHS' as const,
      };
      world.business.locations.push(loc);
      return loc;
    },
    async ownerUpdateLocation(locationId, body) {
      await gate();
      const loc = world.business.locations.find((l) => l.id === locationId);
      if (!loc) throw new ApiError(404, 'not_found', 'Location not found');
      if (body.name !== undefined) loc.name = body.name;
      if (body.email !== undefined) loc.email = body.email;
      if (body.phone !== undefined) loc.phone = body.phone;
      if (body.address1 !== undefined) loc.address1 = body.address1;
      if (body.address2 !== undefined) loc.address2 = body.address2;
      if (body.city !== undefined) loc.city = body.city;
      if (body.postcode !== undefined) loc.postcode = body.postcode;
      if (body.country !== undefined) loc.country = body.country;
      return loc;
    },
    async ownerListScannerDevices(venueId) {
      await gate();
      return { items: (world.devices ?? []).filter((d) => d.venueId === venueId) };
    },
    async ownerPairScannerDevice(venueId, body) {
      await gate();
      const device = {
        id: nextId(world, 'dev'),
        venueId,
        name: body.name,
        platform: 'Android / iOS',
        pairedAt: new Date(now()).toISOString(),
        lastSeen: new Date(now()).toISOString(),
        pairingCode: body.code ? null : '842916',
      };
      world.devices.push(device);
      return device;
    },
    async ownerRevokeScannerDevice(venueId, deviceId) {
      await gate();
      world.devices = (world.devices ?? []).filter((d) => d.id !== deviceId);
    },
  } satisfies Partial<ApiClient>;
}
