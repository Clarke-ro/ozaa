import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Mail, Megaphone, Phone, SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { CardGrid, EmptyCard, FigureCard, InfoRow, Section, SectionBody } from '../../kit';

const BAR = tokens.space[2];

/**
 * One loyalty member on their own page: stamps and rewards up top, how far along the stamp card
 * they are, then how to reach them and whether they agreed to offers. "Stamp or redeem" is the
 * one filled button and opens Scan. The member comes from the same list as Customers (masked
 * phone only, Act 843), so this page shows nothing the list can't.
 */
export function CustomerDetailScreen({ customerId }: { customerId: string }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  // Same key as the unfiltered list on Customers, so opening a card needs no new call.
  const customers = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), '', false],
    queryFn: () => api.ownerListLoyaltyCustomers(venueId, {}),
    enabled: Boolean(venueId),
  });
  const program = useQuery({
    queryKey: ownerKeys.loyalty(venueId),
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  const customer = customers.data?.items.find((item) => item.id === customerId) ?? null;
  const target = program.data?.stampsRequired ?? null;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/customers'));
  const lastVisit = customer
    ? new Date(customer.lastStampAt).toLocaleDateString(i18n.language, { dateStyle: 'long' })
    : '';
  // Stamps towards the next reward: what is left over once full cards became rewards.
  const onCard = customer && target ? customer.stamps % target : null;

  return (
    <OwnerPage
      title={customer ? customer.name || customer.phoneMasked : t('owner.customers')}
      subtitle={customer?.name ? customer.phoneMasked : undefined}
      back={{ label: t('owner.customers'), onPress: back }}
      action={
        customer ? (
          <Button
            label={t('ownerMembers.stampAtScan')}
            size="md"
            onPress={() => router.push('/owner/scan')}
          />
        ) : undefined
      }
    >
      <DeskWait
        loading={customers.isLoading}
        error={customers.isError}
        onRetry={() => void customers.refetch()}
      >
        {customer ? (
          <View style={styles.stack}>
            <CardGrid columns={2}>
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.currentStamps')}
                value={String(customer.stamps)}
              />
              <FigureCard
                order="labelFirst"
                label={t('ownerMembers.unclaimed')}
                value={String(customer.rewardsAvailable)}
                note={customer.rewardsAvailable > 0 ? t('ownerMembers.readyNote') : undefined}
              />
            </CardGrid>

            {target && onCard != null ? (
              <Section title={t('ownerMembers.card')}>
                <SectionBody>
                  <Text variant="body">
                    {t('ownerMembers.progress', { count: onCard, total: target })}
                  </Text>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{ min: 0, max: target, now: onCard }}
                    style={[styles.track, { backgroundColor: theme.wash }]}
                  >
                    <View
                      style={[
                        styles.fill,
                        { backgroundColor: theme.fill, width: `${(onCard / target) * 100}%` },
                      ]}
                    />
                  </View>
                </SectionBody>
              </Section>
            ) : null}

            <Section title={t('ownerMembers.contact')}>
              <InfoRow icon={Phone} label={t('ownerMembers.phone')} value={customer.phoneMasked} />
              {customer.email ? (
                <InfoRow icon={Mail} label={t('ownerMembers.email')} value={customer.email} />
              ) : null}
              <InfoRow icon={CalendarClock} label={t('ownerMembers.lastSeen')} value={lastVisit} />
            </Section>

            <Section title={t('ownerMembers.marketingStatus')}>
              <InfoRow
                icon={Megaphone}
                label={
                  customer.wantsOffers ? t('ownerMembers.consented') : t('ownerMembers.optedOut')
                }
              />
            </Section>
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
  stack: { gap: tokens.space[4] },
  track: { height: BAR, borderRadius: BAR / 2, overflow: 'hidden' },
  fill: { height: BAR, borderRadius: BAR / 2 },
});
