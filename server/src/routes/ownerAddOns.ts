import { Hono, type Context } from 'hono';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { menuItems, modifierGroups } from '../db/schema.ts';
import { body, Problem } from '../http/problem.ts';
import { roleAt, ROLES, signedIn, type OwnerDeps } from '../owner/staff.ts';
import { checkGroup, dropGroup } from '../shared/addOns.ts';
import type { MenuItem, ModifierGroupInput } from '../shared/types.ts';
import { groupFromRow, venueRowById } from '../venues/venueData.ts';

const name = z
  .record(z.string(), z.string().max(80))
  .refine((t) => typeof t.en === 'string', 'English is required');
const groupBody = z.object({
  name,
  min: z.number().int().min(0).max(80),
  max: z.number().int().min(1).max(80),
  options: z
    .array(
      z.object({
        id: z.string().min(1).max(80).optional(),
        name,
        pricePesewas: z.number().int().min(0).max(100_000_000),
      }),
    )
    .max(80),
});

/**
 * The add-on library (api/openapi.yaml owner-menu, modifier-groups). Owners and managers.
 * Dishes list the groups they use by id, so a change here reaches every one of them.
 */
export function ownerAddOnRoutes(deps: OwnerDeps) {
  const app = new Hono();
  const { db } = deps;

  const editorAt = async (c: Context) => {
    const venueId = c.req.param('venueId') ?? '';
    roleAt(await signedIn(c, deps), venueId, ROLES.menu);
    await venueRowById(db, venueId);
    return venueId;
  };
  // Same rules as the mock (shared/addOns.ts): a name, options, and limits that can be met.
  const valuesOf = (input: ModifierGroupInput) => {
    const problem = checkGroup(input);
    if (problem) throw new Problem(400, 'validation', problem);
    return {
      name: input.name,
      min: input.min,
      max: input.max,
      options: input.options.map((option) => ({
        id: option.id ?? `mo_${crypto.randomUUID().replaceAll('-', '')}`,
        name: option.name,
        pricePesewas: option.pricePesewas,
      })),
    };
  };
  const inputOf = async (c: Context) => (await body(c, groupBody)) as ModifierGroupInput;

  app.post('/owner/venues/:venueId/menu/modifier-groups', async (c) => {
    const venueId = await editorAt(c);
    const values = valuesOf(await inputOf(c));
    const [row] = await db
      .insert(modifierGroups)
      .values({ id: `mg_${crypto.randomUUID().replaceAll('-', '')}`, venueId, ...values })
      .returning();
    return c.json(groupFromRow(row!), 201);
  });

  app.put('/owner/venues/:venueId/menu/modifier-groups/:groupId', async (c) => {
    const venueId = await editorAt(c);
    const values = valuesOf(await inputOf(c));
    const [row] = await db
      .update(modifierGroups)
      .set(values)
      .where(
        and(eq(modifierGroups.id, c.req.param('groupId')), eq(modifierGroups.venueId, venueId)),
      )
      .returning();
    if (!row) throw new Problem(404, 'not_found', 'That add-on group is gone.');
    return c.json(groupFromRow(row));
  });

  // Dishes first, then the group: if the second step fails, a dish lists a missing group, which
  // reads as no group (resolveDish skips it), never as a broken menu.
  app.delete('/owner/venues/:venueId/menu/modifier-groups/:groupId', async (c) => {
    const venueId = await editorAt(c);
    const groupId = c.req.param('groupId');
    const dishes = await db
      .select({ id: menuItems.id, details: menuItems.details })
      .from(menuItems)
      .where(and(eq(menuItems.venueId, venueId), isNull(menuItems.deletedAt)));
    for (const dish of dishes) {
      const details = dish.details as Partial<MenuItem>;
      if (!details.modifierGroupIds?.includes(groupId)) continue;
      await db
        .update(menuItems)
        .set({ details: dropGroup(details, groupId) })
        .where(eq(menuItems.id, dish.id));
    }
    await db
      .delete(modifierGroups)
      .where(and(eq(modifierGroups.id, groupId), eq(modifierGroups.venueId, venueId)));
    return c.body(null, 204);
  });

  return app;
}
