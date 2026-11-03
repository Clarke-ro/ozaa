import { DIETARY } from '@/lib/dietary';
import type { MenuItem } from '@/lib/api/types';

// One list for guests and owners (src/lib/dietary.ts), checked against the contract.
export const DIETS: MenuItem['dietary'] = [...DIETARY];

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
