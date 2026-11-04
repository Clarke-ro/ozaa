import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { ModalSheet } from '../../../kit';
import { DragList } from '../../../kit/DragList';

/** Drag the dishes of one section into the order guests should see. Saves as soon as you drop. */
export function ReorderSheet({
  section,
  dishes,
  onOrder,
  onClose,
}: {
  section: MenuCategory;
  dishes: MenuItem[];
  onOrder: (orderedIds: string[]) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerMenu.live.reorderTitle', { name: section.name.en })}
      subtitle={t('ownerMenu.live.reorderLead')}
    >
      <DragList
        items={dishes.map((dish) => ({ key: dish.id, label: dish.name.en }))}
        onOrder={onOrder}
      />
    </ModalSheet>
  );
}
