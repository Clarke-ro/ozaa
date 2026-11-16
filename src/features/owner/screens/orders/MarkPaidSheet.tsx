import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Banknote, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react-native';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type { GuestPayMethods, ManualPaymentMethod, Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { ModalSheet, toast } from '../../kit';

const ICONS: Record<ManualPaymentMethod, LucideIcon> = {
  cash: Banknote,
  card_machine: CreditCard,
  bank_transfer: Landmark,
  momo_merchant: Smartphone,
};

/** The in-person methods this venue takes. Cash is always offered: staff can always take cash. */
export function inPersonMethods(methods: GuestPayMethods | undefined): ManualPaymentMethod[] {
  const list: ManualPaymentMethod[] = ['cash'];
  if (methods?.cardMachine) list.push('card_machine');
  if (methods?.bankTransfer) list.push('bank_transfer');
  if (methods?.momo) list.push('momo_merchant');
  return list;
}

/** "How did they pay?" One tap marks the whole order paid by that method. */
export function MarkPaidSheet({
  order,
  venueId,
  methods,
  currency,
  onClose,
}: {
  order: Order;
  venueId: string;
  methods: ManualPaymentMethod[];
  currency: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  // One key per sheet: a second tap after a dropped connection doesn't mark it twice.
  const [key] = useState(() => Crypto.randomUUID());
  const mark = useMutation({
    mutationFn: (method: ManualPaymentMethod) =>
      api.ownerRecordManualPayment(order.id, { method }, { idempotencyKey: key }),
    onSuccess: () => {
      toast.success(t('ownerOrders.markPaid.done', { number: order.number }));
      void client.invalidateQueries({ queryKey: ownerKeys.orders(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.sales(venueId) });
      onClose();
    },
    onError: (error) => toast.error(t(toMessageKey(error))),
  });
  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={t('ownerOrders.markPaid.title', { number: order.number })}
      subtitle={t('ownerOrders.markPaid.lead', {
        total: formatMoney(pesewas(order.totalPesewas), currency),
      })}
    >
      <View style={styles.list}>
        {methods.map((method) => {
          const Icon = ICONS[method];
          return (
            <Pressable
              key={method}
              accessibilityRole="button"
              aria-busy={mark.isPending}
              disabled={mark.isPending}
              onPress={() => mark.mutate(method)}
              style={({ pressed }) => [
                styles.row,
                { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
              ]}
            >
              <Icon size={20} color={theme.ink} />
              <Text variant="body-strong">{t(`ownerOrders.method.${method}`)}</Text>
            </Pressable>
          );
        })}
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.space[2] },
  row: {
    minHeight: tokens.touchTarget + tokens.space[2],
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
  },
});
