import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Gift, Percent, Pencil, Ticket, Clock } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Promo, PromoInput } from '@/lib/api/types';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { FilterChips } from '@/ui/FilterChips';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { cardStyle, EmptyCard, Toggle, toast } from '../../kit';
import { PromoSheet } from './PromoSheet';

type Filter = 'all' | Promo['state'];
// The canvas groups promos by state, live ones first.
const GROUPS: readonly Promo['state'][] = ['running', 'scheduled', 'off', 'ended'];
const STATE_TONE: Record<Promo['state'], StatusTone | 'neutral'> = {
  running: 'success',
  scheduled: 'info',
  off: 'neutral',
  ended: 'neutral',
};

/**
 * Discounts and codes. Each promo shows what it gives, when it runs and how often it was used;
 * the switch turns it off without deleting it. The server applies the best one to a bill.
 */
export function PromosScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const [filter, setFilter] = useState<Filter>('all');
  const status = STATUS_TONES[theme.scheme];
  const tones = { ...status, neutral: { bg: theme.wash, ink: theme.muted, line: theme.line } };
  const [editing, setEditing] = useState<Promo | 'new' | null>(null);
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const promos = useQuery({
    queryKey: ownerKeys.promos(venueId),
    queryFn: () => api.ownerListPromos(venueId),
    enabled: Boolean(venueId),
  });
  const refresh = () => void client.invalidateQueries({ queryKey: ownerKeys.promos(venueId) });
  const failed = (error: unknown) => {
    const code = (error as { code?: string }).code;
    toast.error(
      code === 'promo_code_taken' ? t('ownerPromos.errors.codeTaken') : t('ownerKit.saveFailed'),
    );
  };
  const save = useMutation({
    mutationFn: ({ id, input }: { id: string | null; input: PromoInput }) =>
      id ? api.ownerUpdatePromo(venueId, id, input) : api.ownerCreatePromo(venueId, input),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: failed,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.ownerDeletePromo(venueId, id),
    onSuccess: () => {
      setEditing(null);
      refresh();
    },
    onError: failed,
  });
  const flip = useMutation({
    mutationFn: (promo: Promo) =>
      api.ownerUpdatePromo(venueId, promo.id, { enabled: !promo.enabled }),
    onSuccess: refresh,
    onError: failed,
  });

  const items = promos.data?.items ?? [];
  const count = (state: Promo['state']) => items.filter((p) => p.state === state).length;
  const shown = filter === 'all' ? items : items.filter((p) => p.state === filter);
  const currency = venue.data?.currency;
  const money = (pesewas: number | null | undefined) =>
    formatMoney((pesewas ?? 0) as never, currency);
  const days = (promo: Promo) =>
    promo.days && promo.days.length > 0 && promo.days.length < 7
      ? promo.days.map((d) => t(`ownerPromos.dayNames.${d}`)).join(', ')
      : t('ownerPromos.everyDay');
  const summary = (promo: Promo) =>
    [
      promo.kind === 'percent_off'
        ? t('ownerPromos.percentOff', { percent: promo.percent })
        : promo.kind === 'amount_off'
          ? t('ownerPromos.amountOff', { amount: money(promo.amountPesewas) })
          : t('ownerPromos.freeItemShort'),
      days(promo),
      promo.startTime ? `${promo.startTime}–${promo.endTime}` : null,
      promo.minSpendPesewas
        ? t('ownerPromos.over', { amount: money(promo.minSpendPesewas) })
        : null,
      t('ownerPromos.used', { count: promo.usageCount }),
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <OwnerPage
      title={t('owner.promos')}
      subtitle={t('ownerPromos.lead')}
      action={<Button label={t('ownerPromos.new')} onPress={() => setEditing('new')} />}
    >
      <DeskWait
        loading={promos.isPending}
        error={promos.isError}
        onRetry={() => void promos.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard
            icon={Ticket}
            title={t('ownerPromos.empty')}
            description={t('ownerPromos.emptyBody')}
            actionLabel={t('ownerPromos.new')}
            onAction={() => setEditing('new')}
          />
        ) : (
          <View style={styles.stack}>
            <FilterChips<Filter>
              label={t('ownerPromos.filter')}
              value={filter}
              onChange={setFilter}
              gutter={0}
              items={[
                { id: 'all', label: t('ownerPromos.states.all'), count: items.length },
                ...(['running', 'scheduled', 'ended', 'off'] as const).map((id) => ({
                  id,
                  label: t(`ownerPromos.states.${id}`),
                  count: count(id),
                })),
              ]}
            />
            {GROUPS.filter((state) => filter === 'all' || filter === state).map((state) => {
              const group = shown.filter((p) => p.state === state);
              if (group.length === 0) return null;
              return (
                <View key={state} style={styles.group}>
                  <Text variant="title" accessibilityRole="header">
                    {t(`ownerPromos.states.${state}`)}
                  </Text>
                  {group.map((promo) => {
                    // Canvas icons: a gift for a free dish, a clock for a timed deal, a ticket for a code.
                    const Icon =
                      promo.kind === 'free_item'
                        ? Gift
                        : promo.startTime
                          ? Clock
                          : promo.code
                            ? Ticket
                            : Percent;
                    return (
                      <View key={promo.id} style={[cardStyle(theme), styles.card]}>
                        <Icon size={22} color={theme.text} />
                        <View style={styles.copy}>
                          <View style={styles.titleRow}>
                            <Text variant="body-strong" numberOfLines={1} style={styles.shrink}>
                              {promo.name}
                            </Text>
                            <View
                              style={[
                                styles.tag,
                                { backgroundColor: tones[STATE_TONE[promo.state]].bg },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.tagText,
                                  { color: tones[STATE_TONE[promo.state]].ink },
                                ]}
                              >
                                {t(`ownerPromos.states.${promo.state}`)}
                              </Text>
                            </View>
                          </View>
                          <Text variant="caption" numberOfLines={2} style={{ color: theme.muted }}>
                            {summary(promo)}
                          </Text>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={t('ownerPromos.editA11y', { name: promo.name })}
                          onPress={() => setEditing(promo)}
                          style={({ pressed }) => [
                            styles.icon,
                            pressed && { backgroundColor: theme.wash },
                          ]}
                        >
                          <Pencil size={18} color={theme.muted} />
                        </Pressable>
                        <Toggle
                          label={t('ownerPromos.onA11y', { name: promo.name })}
                          value={promo.enabled}
                          disabled={flip.isPending}
                          onChange={() => flip.mutate(promo)}
                        />
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerPromos.note')}
            </Text>
          </View>
        )}
      </DeskWait>
      {editing ? (
        <PromoSheet
          visible
          promo={editing === 'new' ? null : editing}
          venueSlug={venue.data?.slug ?? ''}
          saving={save.isPending}
          onClose={() => setEditing(null)}
          onSave={(result) =>
            save.mutate({ id: editing === 'new' ? null : editing.id, input: result.input })
          }
          onDelete={editing === 'new' ? undefined : () => remove.mutate(editing.id)}
        />
      ) : null}
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[8] },
  group: { gap: tokens.owner.controls.listGap },
  tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: tokens.radius.full },
  tagText: { fontSize: 12, lineHeight: 16, fontFamily: 'Inter_600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 80,
    paddingHorizontal: tokens.space[5],
    paddingVertical: tokens.space[3],
  },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[2] },
  shrink: { flexShrink: 1 },
  icon: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
