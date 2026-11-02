import type { MenuItem } from '@/lib/api/types';

export const DIETS: MenuItem['dietary'] = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy'];

// The 14 allergens on the EU and UK declaration list, the most widely used standard set.
export const ALLERGENS = [
  'celery',
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'lupin',
  'milk',
  'molluscs',
  'mustard',
  'tree_nuts',
  'peanuts',
  'sesame',
  'soya',
  'sulphites',
] as const;
