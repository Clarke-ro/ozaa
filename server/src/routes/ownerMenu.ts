import { Hono, type Context } from 'hono';
import { and, count, eq, isNotNull, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Db } from '../db/client.ts';
import { menuCategories, menuItems } from '../db/schema.ts';
import { itemRow } from '../db/seedSamples.ts';
import { imageFor } from '../media/images.ts';
import type { MediaStorage } from '../media/storage.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import type { MenuCategory, MenuItem, ModifierGroup } from '../shared/types.ts';
import { ownGroups, resolveDish } from '../shared/addOns.ts';
import { itemFromRow, libraryOf, menuOf, venueRowById } from '../venues/venueData.ts';

const text = z
  .record(z.string(), z.string().max(400))
  .refine((t) => typeof t.en === 'string', 'English is required');
const name = z.record(z.string(), z.string().max(80)).refine((t) => !!t.en?.trim(), 'Add a name');
const pesewas = z.number().int().min(0).max(100_000_000);
const modifierGroup = z
  .object({
    id: z.string().min(1).max(80),
    name,
    min: z.number().int().min(0).max(80),
    max: z.number().int().min(1).max(80),
    options: z
      .array(z.object({ id: z.string().min(1).max(80), name, pricePesewas: pesewas }))
      .min(1)
      .max(80),
  })
  .refine((group) => group.min <= group.max && group.min <= group.options.length);

const categoryBody = z.object({
  name,
  kind: z.enum(['food', 'drinks']),
  position: z.number().int().min(0).optional(),
  hidden: z.boolean().optional(),
  schedule: z
    .object({
      days: z.array(z.number().int().min(0).max(6)).optional(),
      startTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
      endTime: z
        .string()
        .regex(/^\d{2}:\d{2}$/)
        .optional(),
    })
    .nullable()
    .optional(),
});

// Photos and labels are stored as the app sends them. Add-on prices are checked: they change the bill.
const itemBody = z.object({
  categoryId: z.string().min(1).optional(),
  name: name.optional(),
  description: text.optional(),
  pricePesewas: pesewas.optional(),
  salePricePesewas: pesewas.nullable().optional(),
  available: z.boolean().optional(),
  hidden: z.boolean().optional(),
  stockCount: z.number().int().min(0).nullable().optional(),
  minQuantity: z.number().int().min(1).max(50).optional(),
  maxQuantity: z.number().int().min(1).max(50).optional(),
  position: z.number().int().min(0).optional(),
  photoMediaId: z.string().nullable().optional(),
  dietary: z.array(z.string()).max(12).optional(),
  dietaryCustom: z.array(z.string().min(1).max(24)).max(6).optional(),
  allergens: z.array(z.string().max(40)).max(20).optional(),
  calories: z.number().int().min(0).max(10_000).optional(),
  badges: z.array(z.enum(['popular', 'new', 'chef_pick'])).optional(),
  // Add-on prices are added to the dish. They have to be real pesewas, or a negative price
  // would shrink the bill. The shape is the one the dish form saves.
  modifierGroups: z.array(modifierGroup).max(12).optional(),
  modifierGroupIds: z.array(z.string().min(1).max(80)).max(12).optional(),
  // Sold out until then; null takes the snooze off.
  snoozedUntil: z.iso.datetime({ offset: true }).nullable().optional(),
  prepMinutes: z.number().int().min(0).max(600).optional(),
});
type ItemInput = z.infer<typeof itemBody>;

/** The money and quantity rules a dish must keep (the database checks them too). */
function checkItem(item: MenuItem): void {
  if (item.salePricePesewas != null && item.salePricePesewas >= item.pricePesewas) {
    throw new Problem(422, 'validation', 'The sale price must be below the normal price.');
  }
  if ((item.minQuantity ?? 1) > (item.maxQuantity ?? 50)) {
    throw new Problem(422, 'validation', 'The smallest order is more than the largest.');
  }
}

/**
 * A dish with the edit applied. `photo` is already resolved from photoMediaId by the caller.
 * Only the dish's own add-on groups are stored: library groups are kept by id (shared/addOns.ts),
 * so sending back a dish as it was read never copies a library group into it.
 */
function applyItem(
  current: MenuItem,
  input: ItemInput,
  photo: MenuItem['photo'],
  library: ModifierGroup[],
): MenuItem {
  const { photoMediaId: _id, ...fields } = input;
  if (fields.modifierGroupIds?.some((id) => !library.some((group) => group.id === id))) {
    throw new Problem(422, 'validation', 'That add-on group is gone.');
  }
  const next = { ...current, ...fields, photo } as MenuItem;
  // The zod check above already made sure each name has English.
  if (fields.modifierGroups)
    next.modifierGroups = ownGroups(fields.modifierGroups as ModifierGroup[], library);
  // Setting the stock to 0 sells the dish out; giving stock back puts it on sale again.
  if (input.stockCount === 0) next.available = false;
  return next;
}

/** The menu editor (api/openapi.yaml owner-menu). Owners and managers. */
export function ownerMenuRoutes(deps: OwnerDeps & { storage: MediaStorage | null }) {
  const app = new Hono();
  const { db } = deps;

  /** photoMediaId: missing keeps the photo, null removes it, an id puts in the uploaded photo. */
  const photoFor = async (venueId: string, input: ItemInput, current: MenuItem['photo']) =>
    input.photoMediaId === undefined
      ? current
      : input.photoMediaId === null
        ? null
        : await imageFor(db, deps.storage, venueId, input.photoMediaId);

  const editorAt = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.menu);
    await venueRowById(db, venueId);
    return venueId;
  };

  app.get('/owner/venues/:venueId/menu/categories', async (c) => {
    const venueId = await editorAt(c);
    return c.json({ items: (await menuOf(db, venueId)).categories });
  });

  app.post('/owner/venues/:venueId/menu/categories', async (c) => {
    const venueId = await editorAt(c);
    const input = await body(c, categoryBody);
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(menuCategories)
      .where(eq(menuCategories.venueId, venueId));
    const [row] = await db
      .insert(menuCategories)
      .values({
        id: `cat_${crypto.randomUUID().replaceAll('-', '')}`,
        venueId,
        name: input.name,
        kind: input.kind,
        position: input.position ?? n,
        hidden: input.hidden ?? false,
        schedule: input.schedule ?? null,
      })
      .returning();
    return c.json(categoryFromRow(row!), 201);
  });

  app.patch('/owner/venues/:venueId/menu/categories/:categoryId', async (c) => {
    const venueId = await editorAt(c);
    const input = await body(c, categoryBody);
    const [row] = await db
      .update(menuCategories)
      .set({
        name: input.name,
        kind: input.kind,
        ...(input.position !== undefined ? { position: input.position } : {}),
        ...(input.hidden !== undefined ? { hidden: input.hidden } : {}),
        ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
      })
      .where(
        and(eq(menuCategories.id, c.req.param('categoryId')), eq(menuCategories.venueId, venueId)),
      )
      .returning();
    if (!row) throw new Problem(404, 'not_found', 'That section is gone.');
    return c.json(categoryFromRow(row));
  });

  /**
   * Only an empty section can go: dishes in it would vanish from the menu with it.
   * The section has to belong to this venue. Category ids are on every guest menu, so looking
   * dishes up by category id alone would let one venue delete another's old dishes, or learn
   * whether that section still has live ones (409 versus 204). A section that isn't here gets
   * the same 204 as one already removed, so a second tap still succeeds.
   */
  app.delete('/owner/venues/:venueId/menu/categories/:categoryId', async (c) => {
    const venueId = await editorAt(c);
    const categoryId = c.req.param('categoryId');
    const [category] = await db
      .select({ id: menuCategories.id })
      .from(menuCategories)
      .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.venueId, venueId)));
    if (!category) return c.body(null, 204);
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.categoryId, categoryId),
          eq(menuItems.venueId, venueId),
          isNull(menuItems.deletedAt),
        ),
      );
    if (n > 0)
      throw new Problem(
        409,
        'category_not_empty',
        'Move or delete the dishes in this section first.',
      );
    await db.transaction(async (tx) => {
      // Dishes deleted earlier still point at the section. Past orders keep their own copy of the
      // name and price, so these rows can go now.
      await tx
        .delete(menuItems)
        .where(
          and(
            eq(menuItems.categoryId, categoryId),
            eq(menuItems.venueId, venueId),
            isNotNull(menuItems.deletedAt),
          ),
        );
      await tx
        .delete(menuCategories)
        .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.venueId, venueId)));
    });
    return c.body(null, 204);
  });

  app.post('/owner/venues/:venueId/menu/items', async (c) => {
    const venueId = await editorAt(c);
    const input = await body(c, itemBody);
    if (!input.categoryId || !input.name || input.pricePesewas === undefined) {
      throw new Problem(400, 'validation', 'Add a name, a price and a section.');
    }
    await categoryAt(db, venueId, input.categoryId);
    const [{ n } = { n: 0 }] = await db
      .select({ n: count() })
      .from(menuItems)
      .where(
        and(
          eq(menuItems.categoryId, input.categoryId),
          eq(menuItems.venueId, venueId),
          isNull(menuItems.deletedAt),
        ),
      );
    const blank: MenuItem = {
      id: `itm_${crypto.randomUUID().replaceAll('-', '')}`,
      categoryId: input.categoryId,
      name: input.name,
      description: { en: '' },
      pricePesewas: input.pricePesewas,
      photo: null,
      available: true,
      dietary: [],
      badges: [],
      modifierGroups: [],
      // A new dish goes to the end of its section.
      position: n,
    } as unknown as MenuItem;
    const library = await libraryOf(db, venueId);
    const item = applyItem(blank, input, await photoFor(venueId, input, null), library);
    checkItem(item);
    const [row] = await db.insert(menuItems).values(itemRow(venueId, item)).returning();
    return c.json(resolveDish(itemFromRow(row!), library), 201);
  });

  app.patch('/owner/venues/:venueId/menu/items/:menuItemId', async (c) => {
    const venueId = await editorAt(c);
    const input = await body(c, itemBody);
    const [current] = await db
      .select()
      .from(menuItems)
      .where(
        and(
          eq(menuItems.id, c.req.param('menuItemId')),
          eq(menuItems.venueId, venueId),
          isNull(menuItems.deletedAt),
        ),
      );
    if (!current) throw new Problem(404, 'not_found', 'That dish is gone.');
    if (input.categoryId) await categoryAt(db, venueId, input.categoryId);
    const existing = itemFromRow(current);
    const library = await libraryOf(db, venueId);
    const item = applyItem(
      existing,
      input,
      await photoFor(venueId, input, existing.photo ?? null),
      library,
    );
    checkItem(item);
    const { id: _id, venueId: _venue, ...values } = itemRow(venueId, item);
    const [row] = await db
      .update(menuItems)
      .set(values)
      .where(eq(menuItems.id, current.id))
      .returning();
    return c.json(resolveDish(itemFromRow(row!), library));
  });

  /** Kept as a deleted row: past orders and sales still name it. */
  app.delete('/owner/venues/:venueId/menu/items/:menuItemId', async (c) => {
    const venueId = await editorAt(c);
    await db
      .update(menuItems)
      .set({ deletedAt: new Date(deps.now()) })
      .where(and(eq(menuItems.id, c.req.param('menuItemId')), eq(menuItems.venueId, venueId)));
    return c.body(null, 204);
  });

  return app;
}

function categoryFromRow(c: typeof menuCategories.$inferSelect): MenuCategory {
  return {
    id: c.id,
    name: c.name as MenuCategory['name'],
    kind: c.kind,
    position: c.position,
    hidden: c.hidden,
    ...(c.schedule ? { schedule: c.schedule as MenuCategory['schedule'] } : {}),
  };
}

async function categoryAt(db: Db, venueId: string, categoryId: string) {
  const [row] = await db
    .select({ id: menuCategories.id })
    .from(menuCategories)
    .where(and(eq(menuCategories.id, categoryId), eq(menuCategories.venueId, venueId)));
  if (!row) throw new Problem(422, 'validation', 'Pick a section on this menu.');
}
