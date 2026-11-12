import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { TaxSetup, VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { ownerKeys } from '../../data/keys';
import { Section, SwitchRow, toast } from '../../kit';

/**
 * E-VAT for the open location. Off until the owner switches it on; then orders carry VAT, NHIL
 * and GETFund lines, inside the price or on top. Sales shows the totals only after this.
 */
export function TaxSection({ venue, tin }: { venue: VenueSettings; tin: string | null }) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const tax: TaxSetup = venue.tax ?? { enabled: false, pricesIncludeTax: true, tin: null };
  const save = useMutation({
    mutationFn: (next: TaxSetup) => api.ownerUpdateVenue(venue.id, { tax: next }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venue.id) });
      void client.invalidateQueries({ queryKey: ownerKeys.sales(venue.id) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  return (
    <View style={{ gap: tokens.space[3] }}>
      <Section title={t('ownerBusiness.taxTitle')} note={t('ownerBusiness.taxNote')}>
        <SwitchRow
          label={t('ownerBusiness.taxOn')}
          value={tax.enabled}
          onChange={(enabled) => save.mutate({ ...tax, enabled, tin: tax.tin ?? tin })}
        />
        {tax.enabled ? (
          <SwitchRow
            label={t('ownerBusiness.taxInside')}
            hint={t('ownerBusiness.taxInsideHint')}
            value={tax.pricesIncludeTax}
            onChange={(pricesIncludeTax) => save.mutate({ ...tax, pricesIncludeTax })}
          />
        ) : null}
      </Section>
    </View>
  );
}
