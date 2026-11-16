import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenueSettings } from '@/lib/api/types';
import { formatPhone } from '@/lib/phone';
import { Button } from '@/ui/Button';
import { WhatsAppLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';
import { alertsPatch } from './whatsappAlerts';
import { Field } from '../../kit';
import { useSaveVenue } from '../../data/useSaveVenue';

/**
 * WhatsApp order alerts (BUILD.md 4b.18), shown only when WHATSAPP_ALERTS_ENABLED is on. The switch
 * on its own turns alerts off at once; turning them on waits for a number and its own Save.
 */
export function WhatsAppAlertsCard({ venue }: { venue: VenueSettings }) {
  const { t } = useTranslation();
  const saved = venue.whatsappAlerts ?? null;
  const [on, setOn] = useState(saved !== null);
  const [typed, setTyped] = useState(saved ? formatPhone(saved) : '');
  const [tried, setTried] = useState(false);
  const save = useSaveVenue(venue.id);
  const check = alertsPatch(on, typed);

  const flip = (next: boolean) => {
    setOn(next);
    setTried(false);
    // Off saves straight away, so alerts stop the moment the owner asks.
    if (!next && saved !== null) save.mutate({ whatsappAlerts: null });
  };

  return (
    <IntegrationCard
      logo={<WhatsAppLogo />}
      title={t('ownerPay.whatsapp')}
      subtitle={t('ownerPay.alertsSub')}
      status={saved ? t('ownerPay.on') : t('ownerPay.off')}
      on={on}
      onToggle={flip}
    >
      {on ? (
        <View style={styles.form}>
          <Field
            label={t('ownerPay.alertsNumber')}
            value={typed}
            onChangeText={setTyped}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="024 123 4567"
            hint={t('ownerPay.alertsHint')}
            error={tried && !check.ok ? t('ownerPay.alertsError') : undefined}
          />
          <Button
            label={t('ownerPay.alertsSave')}
            tone="secondary"
            loading={save.isPending}
            onPress={() => (check.ok ? save.mutate(check.patch) : setTried(true))}
            style={styles.save}
          />
        </View>
      ) : null}
    </IntegrationCard>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  save: { alignSelf: 'flex-start' },
});
