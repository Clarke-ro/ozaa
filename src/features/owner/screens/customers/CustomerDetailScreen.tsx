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
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { CardGrid, cardStyle, EmptyCard, FigureCard, SectionLabel, toast } from '../../kit';

const BAR = tokens.space[2];

/**
 * One loyalty member: their card, figures, every recent visit (from real orders) and exactly
 * what they agreed to, with the consent text version. The phone stays masked (Act 843).
 * "Add a stamp" stamps them here when their card can't be scanned; once an hour at most.
 */
export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
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
  const onCard = c ? Math.min(c.stamps, c.stampsRequired) : 0;

  return (
    <OwnerPage
      title={c ? c.name || c.phoneMasked : t('owner.customers')}
      subtitle={c ? c.phoneMasked : undefined}
      back={{ label: t('owner.customers'), onPress: back }}
      action={
        c ? (
          <Button
            label={t('ownerMembers.addStamp')}
            size="md"
            loading={stamp.isPending}
            onPress={() => stamp.mutate()}
          />
        ) : undefined
      }
    >
      <DeskWait
        loading={detail.isLoading}
        error={detail.isError && !detail.data}
        onRetry={() => void detail.refetch()}
      >
        {c ? (
          <View style={styles.stack}>
            <CardGrid columns={4}>
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.visitsTitle')}
                value={String(c.visitCount ?? 0)}
              />
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.spent')}
                value={money(c.spentPesewas ?? 0)}
              />
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.currentStamps')}
                value={String(c.stamps)}
              />
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.favourite')}
                value={c.favouriteItem ?? '—'}
              />
            </CardGrid>

            <View style={styles.group}>
              <SectionLabel title={t('ownerMembers.card')} />
              <View style={[cardStyle(theme), styles.pad]}>
                <Text variant="body">
                  {c.stamps >= c.stampsRequired
                    ? t('ownerMembers.rewardReady')
                    : t('ownerMembers.progress', { count: onCard, total: c.stampsRequired })}
                </Text>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: c.stampsRequired, now: onCard }}
                  style={[styles.track, { backgroundColor: theme.wash }]}
                >
                  <View
                    style={[
                      styles.fill,
                      {
                        backgroundColor: theme.fill,
                        width: `${(onCard / c.stampsRequired) * 100}%`,
                      },
                    ]}
                  />
                </View>
                {c.nextReward ? (
                  <Text variant="caption" style={{ color: theme.muted }}>
                    {c.nextReward}
                  </Text>
                ) : null}
              </View>
            </View>

            <View style={styles.group}>
              <SectionLabel title={t('ownerMembers.visitsTitle')} />
              {c.visits.length === 0 ? (
                <Text variant="body" style={{ color: theme.muted }}>
                  {t('ownerMembers.noVisits')}
                </Text>
              ) : (
                <View style={cardStyle(theme)}>
                  {c.visits.map((visit, index) => (
                    <View
                      key={`${visit.at}-${index}`}
                      style={[
                        styles.row,
                        index > 0 && {
                          borderTopColor: theme.line,
                          borderTopWidth: StyleSheet.hairlineWidth,
                        },
                      ]}
                    >
                      <View style={styles.flex}>
                        <Text variant="body-strong">{date(visit.at)}</Text>
                        <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                          {[
                            visit.tableCode
                              ? t('ownerOrders.table', { code: visit.tableCode })
                              : null,
                            visit.summary || t('ownerMembers.counterStamp'),
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
                </View>
              )}
            </View>

            <View style={styles.group}>
              <SectionLabel title={t('ownerMembers.consentTitle')} />
              <View style={cardStyle(theme)}>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="body-strong">{t('ownerMembers.loyaltyAgreed')}</Text>
                    <Text variant="caption" style={{ color: theme.muted }}>
                      {t('ownerMembers.loyaltyAgreedAt', {
                        date: date(c.consent.loyaltyAt),
                        version: c.consent.textVersion,
                      })}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.row,
                    { borderTopColor: theme.line, borderTopWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text variant="body-strong" style={styles.flex}>
                    {c.consent.marketing
                      ? t('ownerMembers.marketingYes')
                      : t('ownerMembers.marketingNo')}
                  </Text>
                </View>
              </View>
            </View>
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
  stack: { gap: tokens.space[6] },
  group: { gap: tokens.space[3] },
  pad: { padding: tokens.space[5], gap: tokens.space[3] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 64,
    paddingHorizontal: tokens.space[5],
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  track: { height: BAR, borderRadius: BAR / 2, overflow: 'hidden' },
  fill: { height: BAR, borderRadius: BAR / 2 },
});
