import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { Promo } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Chips, Field, ModalSheet, Segmented, SwitchRow } from '../../kit';
import { ownerKeys } from '../../data/keys';
import { draftFrom, EMPTY_DRAFT, toInput, type PromoDraft } from './promoForm';

const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;

/** Add or change one promo. Saving checks the fields here first; the server checks again. */
export function PromoSheet({
  visible,
  promo,
  venueSlug,
  saving,
  onClose,
  onSave,
  onDelete,
}: {
  visible: boolean;
  promo: Promo | null;
  venueSlug: string;
  saving: boolean;
  onClose: () => void;
  onSave: (input: ReturnType<typeof toInput> & { ok: true }) => void;
  onDelete?: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<PromoDraft>(promo ? draftFrom(promo) : EMPTY_DRAFT);
  const [bad, setBad] = useState<keyof PromoDraft | null>(null);
  const menu = useQuery({
    queryKey: ownerKeys.menu(venueSlug),
    queryFn: () => api.getMenu(venueSlug),
    enabled: visible && Boolean(venueSlug),
  });
  const set = (patch: Partial<PromoDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setBad(null);
  };
  const err = (field: keyof PromoDraft) =>
    bad === field ? t(`ownerPromos.errors.${field}`) : undefined;
  const save = () => {
    const result = toInput(draft);
    if (!result.ok) setBad(result.field);
    else onSave(result);
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={promo ? t('ownerPromos.edit') : t('ownerPromos.new')}
      footer={
        <View style={styles.foot}>
          {onDelete ? (
            <Button label={t('ownerPromos.delete')} tone="ghost" size="md" onPress={onDelete} />
          ) : null}
          <View style={styles.grow} />
          <Button label={t('ownerPromos.save')} size="md" loading={saving} onPress={save} />
        </View>
      }
    >
      <View style={styles.stack}>
        <Field
          label={t('ownerPromos.name')}
          value={draft.name}
          onChangeText={(name) => set({ name })}
          error={err('name')}
        />
        <Segmented
          label={t('ownerPromos.kind')}
          value={draft.kind}
          onChange={(kind) => set({ kind })}
          options={(['percent_off', 'amount_off', 'free_item'] as const).map((id) => ({
            id,
            label: t(`ownerPromos.kinds.${id}`),
          }))}
        />
        {draft.kind === 'percent_off' ? (
          <Field
            label={t('ownerPromos.percent')}
            keyboardType="number-pad"
            value={draft.percent}
            onChangeText={(percent) => set({ percent })}
            error={err('percent')}
          />
        ) : draft.kind === 'amount_off' ? (
          <Field
            label={t('ownerPromos.amount')}
            keyboardType="decimal-pad"
            value={draft.amount}
            onChangeText={(amount) => set({ amount })}
            error={err('amount')}
          />
        ) : (
          <Chips
            label={t('ownerPromos.freeItem')}
            single
            selected={draft.freeItemId ? [draft.freeItemId] : []}
            onChange={(ids) => set({ freeItemId: ids[0] ?? null })}
            options={(menu.data?.items ?? [])
              .filter((item) => !item.hidden)
              .map((item) => ({ id: item.id, label: item.name.en ?? '' }))}
          />
        )}
        <Segmented
          label={t('ownerPromos.channel')}
          value={draft.channel}
          onChange={(channel) => set({ channel })}
          options={(['all', 'table', 'online'] as const).map((id) => ({
            id,
            label: t(`ownerPromos.channels.${id}`),
          }))}
        />
        <Chips
          label={t('ownerPromos.days')}
          selected={draft.days}
          onChange={(days) => set({ days })}
          options={DAYS.map((id) => ({ id, label: t(`ownerPromos.dayNames.${id}`) }))}
        />
        <View style={styles.row}>
          <Field
            label={t('ownerPromos.from')}
            placeholder="16:00"
            value={draft.startTime}
            onChangeText={(startTime) => set({ startTime })}
            error={err('startTime')}
          />
          <Field
            label={t('ownerPromos.to')}
            placeholder="18:00"
            value={draft.endTime}
            onChangeText={(endTime) => set({ endTime })}
          />
        </View>
        <View style={styles.row}>
          <Field
            label={t('ownerPromos.minSpend')}
            keyboardType="decimal-pad"
            value={draft.minSpend}
            onChangeText={(minSpend) => set({ minSpend })}
            error={err('minSpend')}
          />
          <Field
            label={t('ownerPromos.code')}
            hint={t('ownerPromos.codeHint')}
            autoCapitalize="characters"
            value={draft.code}
            onChangeText={(code) => set({ code })}
            error={err('code')}
          />
        </View>
        <SwitchRow
          label={t('ownerPromos.on')}
          value={draft.enabled}
          onChange={(enabled) => set({ enabled })}
        />
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  foot: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  grow: { flex: 1 },
});
