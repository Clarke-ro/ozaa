import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../chrome/OwnerPage';
import { CustomerList } from './customers/CustomerList';

/** Customers who joined the loyalty card. The same list as Loyalty > Members, on its own page. */
export function CustomersScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  return (
    <OwnerPage title={t('owner.customers')} subtitle={t('ownerLead.customers')}>
      <CustomerList venueId={venueId} />
    </OwnerPage>
  );
}
