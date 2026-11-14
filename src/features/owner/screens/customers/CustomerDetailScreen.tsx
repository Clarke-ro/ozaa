import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { useOwnerLayout } from '../../chrome/layout';
import { EmptyCard, FigureRow, TitledSection, toast } from '../../kit';
import { timeAgo } from '@/lib/time';
import { ConsentCard } from './ConsentCard';
import { CustomerHead } from './CustomerHead';
import { StampDots } from './StampDots';

/**
 * One loyalty member (canvas): their card, figures, stamps, recent visits (from real orders) and
 * exactly what they agreed to, with the consent text version. The phone stays masked (Act 843).
 * "Add a stamp" stamps them here when their card can't be scanned; once an hour at most.
 */
export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const { desktop } = useOwnerLayout();
  // Read the clock once, so the page stays pure; "2 days ago" doesn't need to tick.
  const [now] = useState(() => Date.now());
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = [...ownerKeys.loyaltyCustomers(venueId), 'detail', customerId];
  const detail = useQuery({
    queryKey: key,
    queryFn: () => api.ownerGetLoyaltyCustomer(venueId, customerId),
    enabled: Boolean(venueId && customerId),
  });
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const stamp = useMutation({
    mutationFn: () =>
      api.ownerStampLoyaltyCustomer(venueId, customerId, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: (result) => {
      if (result.cooldownViolated) toast.error(t('ownerMembers.cooldown'));
      else toast.success(t('ownerMembers.stamped'));
      // Customers, Loyalty and the scan log count the same stamps, so refresh them together.
      void client.invalidateQueries({ queryKey: ownerKeys.loyaltyCustomers(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.loyalty(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.scans(venueId) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/customers'));
  const c = detail.data;
  const money = (v: number) => formatMoney(pesewas(v), venue.data?.currency);
  const date = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { dateStyle: 'medium' });

  const avg = c && c.visitCount ? Math.round((c.spentPesewas ?? 0) / c.visitCount) : null;
  const last = c ? (c.lastVisitAt ?? c.lastStampAt) : null;
  const visitDay = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

  return (
    <OwnerPage
      title={c ? c.name || c.phoneMasked : t('owner.customers')}
      subtitle={
        last ? t('ownerMembers.lastVisitAgo', { ago: timeAgo(last, now, t) }) : undefined
      }
      back={{ label: t('owner.customers'), onPress: back }}
    >
      <DeskWait
        loading={detail.isLoading}
        error={detail.isError && !detail.data}
        onRetry={() => void detail.refetch()}
      >
        {c ? (
          <View style={styles.stack}>
            <View style={styles.group}>
              <CustomerHead
                customer={c}
                stamping={stamp.isPending}
                onStamp={() => stamp.mutate()}
              />
              <FigureRow
                wide={desktop}
                items={[
                  { label: t('ownerMembers.visitsTitle'), value: String(c.visitCount ?? 0) },
                  { label: t('ownerMembers.spent'), value: money(c.spentPesewas ?? 0) },
                  { label: t('ownerMembers.average'), value: avg === null ? '—' : money(avg) },
                  { label: t('ownerMembers.favourite'), value: c.favouriteItem ?? '—' },
                ]}
              />
            </View>
            <StampDots
              stamps={c.stamps}
              required={c.stampsRequired}
              reward={c.nextReward ?? null}
            />
            <TitledSection title={t('ownerMembers.visitsTitle')} cardStyle={styles.list}>
              {c.visits.length === 0 ? (
                <Text variant="body" style={[styles.row, { color: theme.muted }]}>
                  {t('ownerMembers.noVisits')}
                </Text>
              ) : null}
              {c.visits.map((visit, index) => (
                <View
                  key={`${visit.at}-${index}`}
                  style={[
                    styles.row,
                    index > 0 && { borderTopColor: theme.line, borderTopWidth: 1 },
                  ]}
                >
                  <View style={styles.flex}>
                    <Text variant="body">{visitDay(visit.at)}</Text>
                    <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                      {[
                        visit.tableCode
                          ? t('ownerOrders.table', { code: visit.tableCode })
                          : visit.source && visit.source !== 'table'
                            ? t(`ownerOrders.source.${visit.source}`)
                            : null,
                        visit.summary || t('ownerMembers.counterStamp'),
                        visit.stampAdded ? t('ownerMembers.stampAdded') : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {visit.totalPesewas > 0 ? (
                    <Text variant="body-strong">{money(visit.totalPesewas)}</Text>
                  ) : null}
                </View>
              ))}
            </TitledSection>
            <ConsentCard consent={c.consent} date={date} />
          </View>
        ) : (
          <EmptyCard
            icon={SearchX}
            title={t('ownerMembers.missing')}
            description={t('ownerMembers.missingBody')}
            actionLabel={t('ownerMembers.backToList')}
            onAction={back}
          />
        )}
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  group: { gap: tokens.space[5] },
  list: { paddingVertical: 2, paddingHorizontal: tokens.owner.controls.cardPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingVertical: tokens.space[2],
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
});
