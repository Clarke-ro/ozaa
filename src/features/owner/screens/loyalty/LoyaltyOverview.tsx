import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { api } from '@/lib/api';
import { SkeletonBlock } from '../../chrome/OwnerPage';
import { SectionLabel } from '../../kit';
import { SummaryStrip } from '../../kit/SummaryStrip';
import { ownerKeys } from '../../data/keys';

// The overview always shows the last 30 days; Results lets the owner change the range.
const RANGE = '30d';

/** Three numbers above the tabs, so the owner sees how loyalty is doing before editing it. */
export function LoyaltyOverview({ venueId }: { venueId: string }) {
  const { t, i18n } = useTranslation();
  const report = useQuery({
    queryKey: [...ownerKeys.loyaltyAnalytics(venueId), RANGE],
    queryFn: () => api.ownerGetLoyaltyAnalytics(venueId, RANGE),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  // No numbers until the server sends them; never a made-up zero.
  if (!r) return report.isLoading ? <SkeletonBlock height={72} /> : null;
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <View style={{ gap: tokens.space[2] }}>
      <SectionLabel title={t('ownerLoyalty.last30')} caps />
      <SummaryStrip
        items={[
          { label: t('ownerLoyaltyResults.members'), value: n(r.enrolledCount) },
          { label: t('ownerLoyalty.stamps30'), value: n(r.stampsIssued) },
          { label: t('ownerLoyalty.rewards30'), value: n(r.rewardsRedeemed) },
        ]}
      />
    </View>
  );
}
