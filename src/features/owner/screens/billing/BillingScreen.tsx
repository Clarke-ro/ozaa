import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Check, Minus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { cardStyle, FigureRow, toast } from '../../kit';
import { monthlyPrice, PLANS, PLANS_ARE_PLACEHOLDERS, type PlanInfo } from './plans';

/**
 * Billing as on the design canvas: what this business uses now (tables, locations, staff), the
 * plans side by side with the current one outlined, invoices, and a note that prices are
 * placeholders. Plans come from the website's pricing page, so the two never disagree.
 */
export function BillingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { wide, desktop } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled: Boolean(venueId),
  });
  const staff = useQuery({
    queryKey: ownerKeys.staff(venueId),
    queryFn: () => api.ownerListStaff(venueId),
    enabled: Boolean(venueId),
  });
  const planId = business.data?.business.plan;
  const tier = PLANS.findIndex((p) => p.id === planId);

  return (
    <OwnerPage width="mid" title={t('ownerBilling.title')} subtitle={t('ownerBilling.lead')}>
      <DeskWait
        loading={business.isPending}
        error={business.isError}
        onRetry={() => void business.refetch()}
      >
        {business.data ? (
          <View style={styles.stack}>
            <View style={styles.section}>
              <Text variant="title" accessibilityRole="header">
                {t('ownerBilling.usageTitle')}
              </Text>
              <FigureRow
                wide={wide}
                size={30}
                items={[
                  {
                    label: t('ownerBilling.tables'),
                    value: String(tables.data?.items.length ?? '–'),
                  },
                  {
                    label: t('ownerBilling.locations'),
                    value: String(business.data.locations.length),
                  },
                  {
                    label: t('ownerBilling.staff'),
                    value: String(
                      staff.data?.items.filter((m) => m.status !== 'removed').length ?? '–',
                    ),
                  },
                ]}
              />
            </View>
            <View style={styles.section}>
              <Text variant="title" accessibilityRole="header">
                {t('ownerBilling.plansTitle')}
              </Text>
              <View style={[styles.plans, desktop && styles.row]}>
                {PLANS.map((plan, i) => (
                  <PlanCard key={plan.id} plan={plan} place={i - tier} />
                ))}
              </View>
            </View>
            <View style={styles.section}>
              <Text variant="title" accessibilityRole="header">
                {t('ownerBilling.invoicesTitle')}
              </Text>
              <View style={[cardStyle(theme), styles.invoices]}>
                <Text variant="body">{t('ownerBilling.noInvoices')}</Text>
                <Text style={[styles.sub, { color: theme.meta }]}>
                  {t('ownerBilling.onPlan', { plan: PLANS[tier]?.name ?? '' })}
                </Text>
              </View>
            </View>
            {PLANS_ARE_PLACEHOLDERS ? (
              <Text style={[styles.sub, { color: theme.meta }]}>
                {t('ownerBilling.placeholderLong')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

/**
 * One plan (canvas): name, price a month, what it includes, then a button: the current plan says
 * so, the next one up is the page's filled button, the rest are outlined. Billing is not live,
 * so upgrading only says that, and "Talk to us" opens Help.
 */
function PlanCard({ plan, place }: { plan: PlanInfo; place: number }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const current = place === 0;
  return (
    <View
      style={[
        cardStyle(theme),
        styles.card,
        current && { borderColor: theme.text, borderWidth: 2 },
      ]}
    >
      <Text style={styles.name}>{plan.name}</Text>
      <Text>
        <Text style={styles.price}>{monthlyPrice(plan)}</Text>
        <Text style={[styles.sub, { color: theme.meta }]}>{` ${t('ownerBilling.aMonth')}`}</Text>
      </Text>
      <View style={styles.features}>
        {plan.features.map((feature) => {
          const Icon = feature.included ? Check : Minus;
          return (
            <View
              key={feature.label}
              style={styles.feature}
              accessible
              accessibilityLabel={`${feature.label}: ${feature.included ? t('ownerBilling.included') : t('ownerBilling.notIncluded')}`}
            >
              <Icon size={18} color={feature.included ? theme.success : theme.meta} />
              <Text style={[styles.featureText, !feature.included && { color: theme.meta }]}>
                {feature.label}
              </Text>
            </View>
          );
        })}
      </View>
      {current ? (
        <View style={[styles.yours, { backgroundColor: theme.wash }]}>
          <Text variant="button">{t('ownerBilling.current')}</Text>
        </View>
      ) : place === 1 ? (
        <Button
          label={t('ownerBilling.upgrade', { plan: plan.name })}
          onPress={() => toast.success(t('ownerBilling.notLive'))}
        />
      ) : (
        <Button
          label={t('ownerBilling.talk')}
          tone="secondary"
          onPress={() => router.push('/owner/help')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[10] },
  section: { gap: tokens.space[4] },
  plans: { gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  card: { flex: 1, padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  name: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  price: { fontSize: 30, lineHeight: 36, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  features: { flex: 1, gap: 10 },
  feature: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  featureText: { flex: 1, fontSize: 15, lineHeight: 22 },
  yours: {
    height: 48,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoices: {
    minHeight: 64,
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: tokens.owner.controls.cardPadding,
    gap: 2,
  },
});
