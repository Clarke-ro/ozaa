import { useTranslation } from 'react-i18next';
import type { MenuItem } from '@/lib/api/types';
import { DishTile } from './DishTile';
import { MenuStrip } from './MenuStrip';

/**
 * "Most ordered" (BUILD.md 5b.6b): what guests here actually order most, from real sales, not
 * the owner's Popular badge. The caller passes nothing under three dishes, and the row hides.
 */
export function MostOrdered({
  dishes,
  currency,
  onOpen,
  onAdd,
}: {
  dishes: MenuItem[];
  currency: string;
  onOpen: (menuItemId: string) => void;
  /** Null for a dish that needs choices first; it opens instead. */
  onAdd: (item: MenuItem) => (() => void) | null;
}) {
  const { t } = useTranslation();
  if (dishes.length === 0) return null;
  return (
    <MenuStrip title={t('menu.mostOrdered')}>
      {dishes.map((item) => (
        <DishTile
          key={item.id}
          item={item}
          currency={currency}
          onOpen={() => onOpen(item.id)}
          onAdd={onAdd(item)}
        />
      ))}
    </MenuStrip>
  );
}
