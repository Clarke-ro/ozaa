import type { StaffRole } from '@/features/orders';
import type { FloorTable, Order } from '@/lib/api/types';
import { ModalSheet } from '../../kit';
import { TableDetailBody, useTableTitle } from './TableDetailBody';
import type { FloorActions } from './useFloorActions';

/** One table in a sheet over the floor, for screens too narrow for the side panel. */
export function TableDetail({
  onClose,
  ...props
}: {
  table: FloorTable;
  bill: Order | null;
  currency: string;
  role: StaffRole;
  actions: FloorActions;
  onMarkPaid: (order: Order) => void;
  onClose: () => void;
}) {
  const { title, subtitle } = useTableTitle(props.table);
  return (
    <ModalSheet visible onClose={onClose} title={title} subtitle={subtitle}>
      <TableDetailBody {...props} />
    </ModalSheet>
  );
}
