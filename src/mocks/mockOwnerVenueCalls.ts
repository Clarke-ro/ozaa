import { mockUploadedImage } from './mediaRegistry';
import type { ApiClient } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { qrSvg } from '@/lib/qrSvg';
import { nextId, serviceSettings, venueById } from './world';
import type { World } from './world';
import { accessOf, themeOf } from './mockRules';
import type { MockContext } from './mockContext';

/** Mock calls: the owner sets up the venue: details, theme, staff, menu and tables. */
export function mockOwnerVenueCalls(ctx: MockContext) {
  const { world, tokens, now, gate } = ctx;
  return {
    async ownerGetVenue(venueId) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      return {
        ...venue,
        wifi: world.wifi[venue.slug],
        noticeSettings: world.notices[venue.slug] ?? { banner: null, popup: null },
        tax: world.tax[venueId] ?? { enabled: false, pricesIncludeTax: true, tin: null },
        whatsappAlerts: world.whatsappAlerts[venueId] ?? null,
      };
    },
    async ownerUpdateVenue(venueId, body) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      // Tax and the alerts number stay off the public venue: guests never see the TIN or the
      // owner's alerts line.
      const { bannerMediaId, logoMediaId, noticeSettings, tax, whatsappAlerts, ...fields } = body;
      if (tax) world.tax[venueId] = tax;
      if (whatsappAlerts !== undefined) world.whatsappAlerts[venueId] = whatsappAlerts;
      const banner = mockUploadedImage(bannerMediaId) ?? venue.banner;
      const logo = logoMediaId === null ? null : (mockUploadedImage(logoMediaId) ?? venue.logo);
      const next = {
        ...venue,
        ...fields,
        banner,
        logo,
        location: body.location ? { ...venue.location, ...body.location } : venue.location,
        // Saving one menu style choice keeps the others.
        menuStyle: body.menuStyle ? { ...venue.menuStyle, ...body.menuStyle } : venue.menuStyle,
      };
      world.venues[venue.slug] = next;
      if (body.wifi) world.wifi[venue.slug] = body.wifi;
      if (noticeSettings) {
        const current = world.notices[venue.slug] ?? { banner: null, popup: null };
        world.notices[venue.slug] = { ...current, ...noticeSettings };
      }
      return {
        ...next,
        wifi: world.wifi[venue.slug],
        noticeSettings: world.notices[venue.slug] ?? { banner: null, popup: null },
        tax: world.tax[venueId] ?? { enabled: false, pricesIncludeTax: true, tin: null },
        whatsappAlerts: world.whatsappAlerts[venueId] ?? null,
      };
    },
    async ownerSetTheme(venueId, body) {
      await gate();
      accessOf(world, tokens);
      const venue = venueById(world, venueId);
      const theme = themeOf(body.accent, body.fontPair);
      world.venues[venue.slug] = { ...venue, theme };
      return theme;
    },
    async ownerCreateMediaUpload() {
      await gate();
      const mediaId = nextId(world, 'med');
      return {
        mediaId,
        uploadUrl: `https://mock.cravins.app/upload/${mediaId}`,
        expiresAt: new Date(now() + 15 * 60_000).toISOString(),
      };
    },
    async ownerGetServices(venueId) {
      await gate();
      return serviceSettings(venueById(world, venueId));
    },
    async ownerSetServices(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      world.venues[venue.slug] = { ...venue, services: body.services, game: body.game };
      return serviceSettings(world.venues[venue.slug]!);
    },
    async ownerListStaff(venueId) {
      await gate();
      return { items: world.staff.filter((person) => person.venueId === venueId) };
    },
    async ownerInviteStaff(venueId, body) {
      await gate();
      const member: World['staff'][number] = {
        id: nextId(world, 'stf'),
        firstName: body.firstName,
        role: body.role,
        phoneMasked: `0${body.phone.slice(4, 6)} *** ${body.phone.slice(-4)}`,
        status: 'invited',
        venueId,
        phone: body.phone,
      };
      world.staff.push(member);
      return member;
    },
    async ownerUpdateStaff(venueId, staffId, body) {
      await gate();
      const member = world.staff.find((s) => s.id === staffId && s.venueId === venueId);
      if (!member) throw new ApiError(404, 'not_found', 'Staff member not found');
      if (member.role === 'owner')
        throw new ApiError(409, 'owner_role', "The owner's role can't be changed");
      if (body.role !== undefined) member.role = body.role;
      if (body.tableCodes !== undefined) member.tableCodes = body.tableCodes;
      return member;
    },
    async ownerSignOutStaff(venueId, staffId) {
      await gate();
      const member = world.staff.find((s) => s.id === staffId && s.venueId === venueId);
      if (!member) throw new ApiError(404, 'not_found', 'Staff member not found');
      if (member.role === 'owner')
        throw new ApiError(409, 'owner_sign_out', 'The owner signs out in Settings');
      member.onShift = false;
    },
    async ownerResetStaffPin(venueId, staffId) {
      await gate();
      const member = world.staff.find((s) => s.id === staffId && s.venueId === venueId);
      if (!member) throw new ApiError(404, 'not_found', 'Staff member not found');
      member.hasPin = false;
    },
    async ownerRevokeStaff(venueId, staffId) {
      await gate();
      world.staff = world.staff.filter((s) => s.id !== staffId);
    },
    async ownerListCategories(venueId) {
      await gate();
      const venue = venueById(world, venueId);
      return { items: world.menus[venue.slug]?.categories ?? [] };
    },
    async ownerCreateCategory(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) throw new ApiError(404, 'order_not_found', 'Menu not found');
      const category = {
        id: nextId(world, 'cat'),
        name: body.name,
        kind: body.kind,
        position: body.position ?? menu.categories.length,
        schedule: body.schedule,
        hidden: body.hidden ?? false,
      };
      menu.categories.push(category);
      return category;
    },
    async ownerUpdateCategory(venueId, categoryId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const category = world.menus[venue.slug]?.categories.find((item) => item.id === categoryId);
      if (!category) throw new ApiError(404, 'order_not_found', 'Category not found');
      category.name = body.name;
      category.kind = body.kind;
      if (body.position !== undefined) category.position = body.position;
      if (body.schedule !== undefined) category.schedule = body.schedule;
      if (body.hidden !== undefined) category.hidden = body.hidden;
      return category;
    },
    async ownerDeleteCategory(venueId, categoryId) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) return;
      menu.categories = menu.categories.filter((item) => item.id !== categoryId);
    },
    async ownerCreateItem(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu || !body.categoryId || !body.name || body.pricePesewas === undefined) {
        throw new ApiError(400, 'bad_request', 'Add a name, price and category');
      }
      const item = {
        id: nextId(world, 'itm'),
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? { en: '' },
        pricePesewas: body.pricePesewas,
        photo: mockUploadedImage(body.photoMediaId) ?? null,
        available: body.available ?? true,
        dietary: body.dietary ?? [],
        dietaryCustom: body.dietaryCustom ?? [],
        allergens: body.allergens ?? [],
        calories: body.calories,
        badges: body.badges ?? [],
        modifierGroups: body.modifierGroups ?? [],
        prepMinutes: body.prepMinutes,
        // A new dish goes to the end of its section.
        position:
          body.position ??
          menu.items.filter((other) => other.categoryId === body.categoryId).length,
        hidden: body.hidden ?? false,
        salePricePesewas: body.salePricePesewas ?? null,
        stockCount: body.stockCount ?? null,
        minQuantity: body.minQuantity,
        maxQuantity: body.maxQuantity,
        // Like the server: a dish added with nothing in stock starts sold out.
        ...(body.stockCount === 0 ? { available: false } : {}),
      };
      menu.items.push(item);
      return item;
    },
    async ownerUpdateItem(venueId, itemId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      const index = menu?.items.findIndex((item) => item.id === itemId) ?? -1;
      if (!menu || index < 0) throw new ApiError(404, 'order_not_found', 'Dish not found');
      const current = menu.items[index];
      if (!current) throw new ApiError(404, 'order_not_found', 'Dish not found');
      // photoMediaId: undefined keeps the photo, null removes it, an id swaps in the uploaded one.
      const photo =
        body.photoMediaId === undefined
          ? current.photo
          : body.photoMediaId === null
            ? null
            : (mockUploadedImage(body.photoMediaId) ?? current.photo);
      const { photoMediaId: _photoMediaId, ...fields } = body;
      const next = { ...current, ...fields, photo };
      // Setting the stock to 0 sells the dish out, as the server does.
      if (body.stockCount === 0) next.available = false;
      menu.items[index] = next;
      return next;
    },
    async ownerDeleteItem(venueId, itemId) {
      await gate();
      const venue = venueById(world, venueId);
      const menu = world.menus[venue.slug];
      if (!menu) return;
      menu.items = menu.items.filter((item) => item.id !== itemId);
    },
    async ownerListTables(venueId) {
      await gate();
      return { items: world.tables[venueId] ?? [] };
    },
    async ownerCreateTables(venueId, body) {
      await gate();
      const venue = venueById(world, venueId);
      const created = body.codes.map((code) => ({
        id: `tbl_${venue.slug}_${code}`,
        code,
        label: `Table ${code}`,
        qrUrl: `https://cravins.app/${venue.slug}/t/${code}`,
      }));
      world.tables[venueId] = [...(world.tables[venueId] ?? []), ...created];
      return { items: created };
    },
    async ownerGetTableQr(venueId, tableId) {
      await gate();
      const table = (world.tables[venueId] ?? []).find((item) => item.id === tableId);
      if (!table?.qrUrl) throw new ApiError(404, 'venue_not_found', 'Table not found');
      return qrSvg(table.qrUrl, 256);
    },
  } satisfies Partial<ApiClient>;
}
