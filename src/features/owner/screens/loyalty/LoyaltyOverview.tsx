import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { SkeletonBlock } from '../../chrome/OwnerPage';
import { useOwnerLayout } from '../../chrome/layout';
import { FigureRow } from '../../kit';
import { ownerKeys } from '../../data/keys';

// The overview always shows the last 30 days; Results lets the owner change the range.
const RANGE = '30d';

/**
 * The figure cards above the tabs (design canvas): members, stamps given and rewards claimed.
 * The canvas also shows "Agreed to offers"; the loyalty report has no such number yet, so it is
 * left out rather than shown as a made-up zero.
 */
export function LoyaltyOverview({ venueId }: { venueId: string }) {
  const { t, i18n } = useTranslation();
  const { wide } = useOwnerLayout();
  const report = useQuery({
    queryKey: [...ownerKeys.loyaltyAnalytics(venueId), RANGE],
    queryFn: () => api.ownerGetLoyaltyAnalytics(venueId, RANGE),
    enabled: Boolean(venueId),
  });
  const r = report.data;
  // No numbers until the server sends them; never a made-up zero.
  if (!r) return report.isPending ? <SkeletonBlock height={128} /> : null;
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <FigureRow
      wide={wide}
      items={[
        { label: t('ownerLoyaltyResults.members'), value: n(r.enrolledCount) },
        {
          label: t('ownerLoyalty.stampsGiven'),
          short: t('ownerShort.stampsGiven'),
          value: n(r.stampsIssued),
        },
        {
          label: t('ownerLoyalty.rewardsClaimed'),
          short: t('ownerShort.rewardsClaimed'),
          value: n(r.rewardsRedeemed),
        },
      ]}
    />
  );
}
