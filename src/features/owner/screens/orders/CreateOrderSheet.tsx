import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Crypto from 'expo-crypto';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { isOnGuestMenu } from '@/lib/dishRules';
import { formatMoney } from '@/lib/money';
import { toMessageKey } from '@/lib/api/errors';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { manualOrder, type DraftLine } from '../../desk/manualOrder';
import { Chips, Field, ModalSheet, SectionLabel, toast } from '../../kit';
import { PickDishRow } from './PickDishRow';

const COUNTER = 'counter';

/** Staff enter an order by hand: which table (or the counter), the dishes, options and a note. */
export function CreateOrderSheet({
  venueId,
  slug,
  currency,
  onClose,
}: {
  venueId: string;
  slug: string;
  currency: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const menu = useQuery({ queryKey: ownerKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
  });
  const [table, setTable] = useState(COUNTER);
  const [lines, setLines] = useState<Record<string, DraftLine>>({});
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  // One id per sheet, so a retry after a dropped connection never makes two orders.
  const [clientOrderId] = useState(() => Crypto.randomUUID());

  const check = manualOrder(Object.values(lines));
  const missingKey = tried && !check.ok && check.reason === 'choice' ? check.key : null;
  const missingGroup = tried && !check.ok && check.reason === 'choice' ? check.group : null;
  // Staff can only add what a guest could order right now.
  const dishes = (menu.data?.items ?? []).filter((item) => item.available && isOnGuestMenu(item));

  const send = useMutation({
    mutationFn: () => {
      if (!check.ok) throw new Error('invalid');
      return api.ownerCreateOrder(
        venueId,
        {
          clientOrderId,
          lines: check.lines,
          tableCode: table === COUNTER ? null : table,
          note: note.trim() || undefined,
        },
        { idempotencyKey: clientOrderId },
      );
    },
    onSuccess: (order) => {
      toast.success(t('ownerOrders.create.sent', { number: order.number }));
      void client.invalidateQueries({ queryKey: ownerKeys.orders(venueId) });
      onClose();
    },
    onError: (error) => toast.error(t(toMessageKey(error))),
  });

  const submit = () => {
    setTried(true);
    if (check.ok) send.mutate();
  };

  return (
    <ModalSheet
      visible
      fullScreen
      onClose={onClose}
      title={t('ownerOrders.create.title')}
      subtitle={t('ownerOrders.create.lead')}
      footer={
        <Button
          label={
            check.ok
              ? t('ownerOrders.create.send', {
                  total: formatMoney(pesewas(check.estimatePesewas), currency),
                })
              : t('ownerOrders.create.sendEmpty')
          }
          style={styles.flex}
          loading={send.isPending}
          onPress={submit}
        />
      }
    >
      <SectionLabel title={t('ownerOrders.create.table')} caps />
      <Chips
        single
        label={t('ownerOrders.create.table')}
        options={[
          { id: COUNTER, label: t('ownerOrders.create.counter') },
          ...(tables.data?.items ?? []).map((row) => ({ id: row.code, label: row.code })),
        ]}
        selected={[table]}
        onChange={(ids) => setTable(ids[0] ?? COUNTER)}
      />
      <SectionLabel title={t('ownerOrders.create.dishes')} caps />
      <View>
        {dishes.map((item) => (
          <PickDishRow
            key={item.id}
            item={item}
            line={lines[item.id]}
            currency={currency}
            missing={missingKey === item.id ? missingGroup : null}
            onChange={(next) => setLines({ ...lines, [item.id]: next })}
          />
        ))}
      </View>
      {tried && !check.ok ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {check.reason === 'empty'
            ? t('ownerOrders.create.errEmpty')
            : t('ownerOrders.create.errChoice', { group: check.group })}
        </Text>
      ) : null}
      <Field
        label={t('ownerOrders.create.note')}
        value={note}
        onChangeText={setNote}
        placeholder={t('ownerOrders.create.notePlaceholder')}
        maxLength={200}
        multiline
      />
      <Text variant="caption" style={{ color: theme.meta }}>
        {t('ownerOrders.create.estimate')}
      </Text>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
