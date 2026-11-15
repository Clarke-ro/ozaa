import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { Button } from '@/ui/Button';
import { useOwnerLayout } from '../chrome/layout';
import { ownerKeys } from '../data/keys';
import { downloadCsv, FigureRow } from '../kit';
import { customersCsv } from './customers/customersCsv';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../chrome/OwnerPage';
import { CustomerList } from './customers/CustomerList';

/**
 * Customers who joined the loyalty card (design canvas): Export CSV in the header, three figures
 * (members, new in the last 30 days, and how many came more than once), then the member list.
 */
export function CustomersScreen() {
  const { t, i18n } = useTranslation();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  // The whole list, unfiltered: the figures and the export use it (the same cache as the list).
  const all = useQuery({
    queryKey: [...ownerKeys.loyaltyCustomers(venueId), '', 'all'],
    queryFn: () => api.ownerListLoyaltyCustomers(venueId, {}),
    enabled: Boolean(venueId),
  });
  const report = useQuery({
    queryKey: [...ownerKeys.loyaltyAnalytics(venueId), '30d'],
    queryFn: () => api.ownerGetLoyaltyAnalytics(venueId, '30d'),
    enabled: Boolean(venueId),
  });
  const items = all.data?.items ?? [];
  const total = all.data?.totalCount ?? items.length;
  const repeat = items.filter((c) => (c.visitCount ?? 0) >= 2).length;
  const n = (v: number) => v.toLocaleString(i18n.language);
  return (
    <OwnerPage
      width="mid"
      title={t('owner.customers')}
      subtitle={t('ownerLead.customers')}
      action={
        <Button
          label={t('ownerMembers.export')}
          tone="secondary"
          disabled={items.length === 0}
          onPress={() =>
            void downloadCsv(
              customersCsv(items),
              `cravins-loyalty-members-${venueId}.csv`,
              t('ownerMembers.exportTitle'),
            )
          }
        />
      }
    >
      {all.data ? (
        <FigureRow
          wide={wide}
          size={30}
          items={[
            { label: t('ownerMembers.figures.members'), value: n(total) },
            {
              label: t('ownerMembers.figures.new'),
              short: t('ownerShort.newMembers'),
              value: report.data ? n(report.data.newEnrollments) : '–',
            },
            {
              label: t('ownerMembers.figures.cameBack'),
              short: t('ownerShort.cameBack'),
              value: items.length ? `${Math.round((repeat / items.length) * 100)}%` : '–',
            },
          ]}
        />
      ) : null}
      <CustomerList venueId={venueId} showExport={false} />
    </OwnerPage>
  );
}
