import { View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { TaxSetup, VenueSettings } from '@/lib/api/types';
import { ownerKeys } from '../../data/keys';
import { cardStyle, SwitchRow, toast } from '../../kit';
import { useTheme } from '@/ui/theme';

/**
 * E-VAT for the open location. Off until the owner switches it on; then orders carry VAT, NHIL
 * and GETFund lines, inside the price or on top. Sales shows the totals only after this.
 */
export function TaxSection({ venue, tin }: { venue: VenueSettings; tin: string | null }) {
  const theme = useTheme();
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
    // Canvas: a switch card under the tax numbers in "Contact and tax", not a section of its own.
    <View style={[cardStyle(theme), { overflow: 'hidden' }]}>
      <SwitchRow
        label={t('ownerBusiness.taxOn')}
        hint={t('ownerBusiness.taxNote')}
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
    </View>
  );
}
