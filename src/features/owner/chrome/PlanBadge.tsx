import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../data/keys';
import { planById } from '../screens/billing/plans';

/** The plan name next to the wordmark. Shows nothing until the business has loaded. */
export function PlanBadge() {
  const theme = useTheme();
  const { t } = useTranslation();
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const plan = business.data ? planById(business.data.business.plan) : undefined;
  if (!plan) return null;
  return (
    <View
      accessible
      accessibilityLabel={t('ownerChrome.plan', { plan: plan.name })}
      style={[styles.badge, { borderColor: theme.line, backgroundColor: theme.wash }]}
    >
      <Text
        variant="caption"
        maxFontSizeMultiplier={1.4}
        style={[styles.label, { color: theme.text }]}
      >
        {plan.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: tokens.space[2],
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontFamily: 'Inter_600',
    fontSize: tokens.owner.micro.size,
    lineHeight: tokens.owner.micro.line,
  },
});
