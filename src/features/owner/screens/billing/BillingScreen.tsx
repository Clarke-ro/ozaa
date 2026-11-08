import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check, Minus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { DeskCard, StatusPill } from '../../kit';
import { PLANS, PLANS_ARE_PLACEHOLDERS, monthlyPrice, type PlanInfo } from './plans';

/** The owner's plan and the others on offer, side by side on wide screens. */
export function BillingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const threeCol = width >= 900;
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });

  return (
    <OwnerPage title={t('ownerBilling.title')}>
      <DeskWait
        loading={business.isPending}
        error={business.isError}
        onRetry={() => void business.refetch()}
      >
        {business.data ? (
          <View style={styles.stack}>
            <View style={[styles.list, threeCol && styles.row]}>
              {PLANS.map((plan) => (
                <View key={plan.id} style={threeCol ? styles.col : undefined}>
                  <PlanCard
                    plan={plan}
                    current={plan.id === business.data.business.plan}
                  />
                </View>
              ))}
            </View>
            {PLANS_ARE_PLACEHOLDERS ? (
              <Text variant="caption" style={{ color: theme.meta }}>
                {t('ownerBilling.placeholder')}
              </Text>
            ) : null}
          </View>
        ) : null}
      </DeskWait>
    </OwnerPage>
  );
}

function PlanCard({ plan, current }: { plan: PlanInfo; current: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const price =
    plan.monthly === 0 ? null : t('ownerBilling.perMonth', { price: monthlyPrice(plan) });
  return (
    <DeskCard
      tone={current ? 'selected' : 'plain'}
      style={[styles.card, current && { borderColor: theme.ink }]}
    >
      <View style={styles.head}>
        <View style={styles.name}>
          <Text variant="title">{plan.name}</Text>
          <Text variant="caption" style={{ color: theme.meta }}>
            {plan.blurb}
          </Text>
        </View>
        {current ? <StatusPill label={t('ownerBilling.yourPlan')} tone="accent" boxed /> : null}
      </View>
      {price ? <Text variant="body-strong">{price}</Text> : null}
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
              <Icon size={16} color={feature.included ? theme.success : theme.muted} />
              <Text
                variant="caption"
                style={{ color: feature.included ? theme.text : theme.muted }}
              >
                {feature.label}
              </Text>
            </View>
          );
        })}
      </View>
    </DeskCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  list: { gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'stretch', gap: tokens.space[4] },
  col: { flex: 1, minWidth: 0 },
  card: { flex: 1, gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  name: { flex: 1, gap: 2 },
  features: { gap: tokens.space[2] },
  feature: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
});
