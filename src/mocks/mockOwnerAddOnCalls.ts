import type { ApiClient } from '@/lib/api/client';
import type { Menu, ModifierGroup, ModifierGroupInput } from '@/lib/api/types';
import { ApiError } from '@/lib/api/errors';
import { checkGroup, dropGroup } from '@/lib/addOns';
import { nextId, venueById } from './world';
import type { MockContext } from './mockContext';

/** Mock calls: the add-on library (Menu.modifierGroups), shared by dishes through modifierGroupIds. */
export function mockOwnerAddOnCalls(ctx: MockContext) {
  const { world, gate } = ctx;

  const menuOf = (venueId: string): Menu => {
    const menu = world.menus[venueById(world, venueId).slug];
    if (!menu) throw new ApiError(404, 'not_found', 'Menu not found');
    return menu;
  };
  // Options that keep their id stay the same option; new ones get an id.
  const groupFrom = (id: string, input: ModifierGroupInput): ModifierGroup => {
    const problem = checkGroup(input);
    if (problem) throw new ApiError(400, 'validation', problem);
    return {
      id,
      name: input.name,
      min: input.min,
      max: input.max,
      options: input.options.map((option) => ({
        id: option.id ?? nextId(world, 'mo'),
        name: option.name,
        pricePesewas: option.pricePesewas,
      })),
    };
  };

  return {
    async ownerCreateModifierGroup(venueId, body) {
      await gate();
      const menu = menuOf(venueId);
      const group = groupFrom(nextId(world, 'mg'), body);
      menu.modifierGroups = [...(menu.modifierGroups ?? []), group];
      return group;
    },
    async ownerUpdateModifierGroup(venueId, groupId, body) {
      await gate();
      const menu = menuOf(venueId);
      const library = menu.modifierGroups ?? [];
      if (!library.some((group) => group.id === groupId))
        throw new ApiError(404, 'not_found', 'That add-on group is gone');
      const group = groupFrom(groupId, body);
      menu.modifierGroups = library.map((old) => (old.id === groupId ? group : old));
      return group;
    },
    async ownerDeleteModifierGroup(venueId, groupId) {
      await gate();
      const menu = menuOf(venueId);
      menu.modifierGroups = (menu.modifierGroups ?? []).filter((group) => group.id !== groupId);
      menu.items = menu.items.map((item) => dropGroup(item, groupId));
    },
  } satisfies Partial<ApiClient>;
}
