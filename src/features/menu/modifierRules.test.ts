import { validateModifiers } from './modifierRules';
import type { ModifierGroup } from '@/lib/api/types';

describe('validateModifiers', () => {
  const group: ModifierGroup = {
    id: 'grp_spice',
    name: { en: 'Spice Level' },
    min: 1,
    max: 1,
    options: [
      { id: 'opt_mild', name: { en: 'Mild' }, pricePesewas: 0 },
      { id: 'opt_med', name: { en: 'Medium' }, pricePesewas: 0 },
      { id: 'opt_hot', name: { en: 'Extra Hot' }, pricePesewas: 500 },
    ],
  };

  test('validates single required choice', () => {
    expect(validateModifiers(group, ['opt_mild']).valid).toBe(true);
    expect(validateModifiers(group, []).valid).toBe(false);
    expect(validateModifiers(group, ['opt_mild', 'opt_hot']).valid).toBe(false);
  });

  test('validates multi-choice group with min and max', () => {
    const toppings: ModifierGroup = {
      id: 'grp_toppings',
      name: { en: 'Extra Toppings' },
      min: 0,
      max: 2,
      options: [
        { id: 'opt_egg', name: { en: 'Boiled Egg' }, pricePesewas: 500 },
        { id: 'opt_plantain', name: { en: 'Kelewele' }, pricePesewas: 1500 },
        { id: 'opt_fish', name: { en: 'Fried Fish' }, pricePesewas: 2500 },
      ],
    };

    expect(validateModifiers(toppings, []).valid).toBe(true);
    expect(validateModifiers(toppings, ['opt_egg']).valid).toBe(true);
    expect(validateModifiers(toppings, ['opt_egg', 'opt_plantain']).valid).toBe(true);
    expect(validateModifiers(toppings, ['opt_egg', 'opt_plantain', 'opt_fish']).valid).toBe(false);
  });
});
