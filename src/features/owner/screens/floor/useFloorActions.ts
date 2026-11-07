import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { OrderStatus } from '@/features/orders';
import { api } from '@/lib/api';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';

/**
 * The three things staff can do from a table's sheet: move the order on, record cash, and
 * answer the waiter call. Each one refreshes the floor, the orders and Today, because a
 * table's status is worked out from orders and calls. A failure says so in a toast, like
 * Orders and Calls do, instead of the button just stopping.
 */
export function useFloorActions(venueId: string) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ownerKeys.floor(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.orders(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.dashboard(venueId) });
  };
  const failed = () => toast.error(t('ownerKit.saveFailed'));

  const status = useMutation({
    mutationFn: (input: { id: string; next: OrderStatus }) =>
      api.ownerSetOrderStatus(input.id, { status: input.next }),
    onSuccess: refresh,
    onError: failed,
  });

  const cash = useMutation({
    mutationFn: (input: { id: string; amount: number; key: string }) =>
      api.ownerRecordCashPayment(
        input.id,
        { amountPesewas: input.amount },
        // The caller keeps one key per bill and amount, so a retry after a lost response is the
        // same request to the server and the cash is never recorded twice.
        { idempotencyKey: input.key },
      ),
    onSuccess: refresh,
    onError: failed,
  });

  const call = useMutation({
    mutationFn: (input: { id: string; status: 'acknowledged' | 'resolved' }) =>
      api.ownerUpdateWaiterCall(input.id, { status: input.status }),
    onSuccess: refresh,
    onError: failed,
  });

  return {
    moveOrder: (id: string, next: OrderStatus) => status.mutate({ id, next }),
    recordCash: (id: string, amount: number, key: string) => cash.mutate({ id, amount, key }),
    answerCall: (id: string, next: 'acknowledged' | 'resolved') =>
      call.mutate({ id, status: next }),
    moving: status.isPending,
    paying: cash.isPending,
    answering: call.isPending,
  };
}

export type FloorActions = ReturnType<typeof useFloorActions>;
