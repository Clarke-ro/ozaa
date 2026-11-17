import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { nextOrderMove, type OrderStatus, type StaffRole } from '@/features/orders';
import type { Order } from '@/lib/api/types';
import { finishWord, statusKey } from '@/lib/orderTimeline';
import { invalidateOwnerQueries } from '../../data/invalidateOwnerQueries';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/**
 * Move a ticket to its next stage, from Orders or from Today. Every screen that shows orders
 * (Orders, Floor, Today) refreshes after a move.
 */
export function useOrderMove(venueId: string, role: StaffRole) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const move = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus; source?: Order['source'] }) =>
      api.ownerSetOrderStatus(id, { status }),
    onSuccess: (_o, { status, source }) => {
      toast.success(t(statusKey({ status, source })));
      invalidateOwnerQueries(client, [
        ownerKeys.orders(venueId),
        ownerKeys.floor(venueId),
        ownerKeys.dashboard(venueId),
      ]);
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  return {
    /** The next-step label for this person, or null when they have none for this ticket. */
    label: (order: Order) => {
      const next = nextOrderMove(order.status, role);
      if (!next) return null;
      // Pickup and delivery orders end as picked up or delivered, not served.
      return next.move === 'serve'
        ? t(`ownerOrders.move.${finishWord(order.source)}`)
        : t(`ownerOrders.move.${next.move}`);
    },
    busy: (order: Order) => move.isPending && move.variables?.id === order.id,
    run: (order: Order) => {
      const next = nextOrderMove(order.status, role);
      if (next) move.mutate({ id: order.id, status: next.status, source: order.source });
    },
  };
}
