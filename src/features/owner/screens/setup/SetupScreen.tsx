import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { DeskWait } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { toast } from '../../kit';
import { planTables } from '../tables/planTables';
import type { WifiForm } from '../services/WifiSection';
import { PaymentsStep } from './PaymentsStep';
import { SetupDone } from './SetupDone';
import { SetupField } from './SetupField';
import { SetupFooter } from './SetupFooter';
import { SetupFrame } from './SetupFrame';
import { SetupSteps } from './SetupSteps';
import { TablesStep } from './TablesStep';
import { WifiStep } from './WifiStep';
import { STEPS, footerFor, setupSummary, type Step } from './setupFlow';

/**
 * First-time setup in four short steps, then a summary. Each step saves before moving on.
 * Wi-Fi and online payments can be skipped: guests can always pay in person.
 */
export function SetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const on = Boolean(venueId);
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: on,
  });
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled: on,
  });
  // Connecting Paystack in Integrations updates this cache, so coming back shows it connected.
  const payment = useQuery({
    queryKey: ownerKeys.paymentSettings(venueId),
    queryFn: () => api.ownerGetPaymentSettings(venueId),
    enabled: on,
  });
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [wifiDraft, setWifi] = useState<WifiForm | null>(null);

  const v = venue.data;
  const venueName = name ?? v?.name ?? '';
  const venuePlace = place ?? v?.location.label ?? '';
  // Start from the Wi-Fi the venue already has, so a second run doesn't show it empty.
  const wifi: WifiForm = wifiDraft ?? {
    ssid: v?.wifi?.ssid ?? '',
    password: v?.wifi?.password ?? '',
    security: v?.wifi?.security ?? 'WPA2',
    hidden: v?.wifi?.hidden ?? false,
  };
  const existing = tables.data?.items ?? [];
  const plan = planTables(
    'range',
    { start: from, end: to, prefix: '', list: '' },
    existing.map((x) => x.code),
  );
  const paystack = Boolean(payment.data?.paystack);
  const current: Step | undefined = STEPS[step];

  const problem = (): string | null => {
    if (current === 'venue') return venueName.trim() ? null : t('ownerSetup.err.name');
    if (current === 'tables' && plan.error && existing.length === 0)
      return t(plan.error, { max: 200 });
    return null;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (current === 'venue')
        await api.ownerUpdateVenue(venueId, {
          name: venueName.trim(),
          location: { label: venuePlace.trim() },
        });
      if (current === 'tables' && plan.codes.length)
        await api.ownerCreateTables(venueId, { codes: plan.codes });
      if (current === 'wifi' && wifi.ssid.trim())
        await api.ownerUpdateVenue(venueId, { wifi: { ...wifi, ssid: wifi.ssid.trim() } });
    },
    onSuccess: () => {
      setShowErrors(false);
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.tables(venueId) });
      setStep((s) => s + 1);
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const next = () => {
    const issue = problem();
    if (issue) {
      setShowErrors(true);
      toast.error(issue);
      return;
    }
    save.mutate();
  };
  const err = showErrors ? problem() : null;

  if (!current) {
    const rows = setupSummary({
      venueName: v?.name ?? '',
      tableCount: existing.length,
      wifiName: v?.wifi?.ssid ?? '',
      paystack,
    });
    return (
      <SetupFrame>
        <SetupDone rows={rows} onEdit={(target) => setStep(STEPS.indexOf(target))} />
      </SetupFrame>
    );
  }

  const footer = footerFor(current, paystack);
  return (
    <SetupFrame
      footer={
        <SetupFooter
          footer={footer}
          busy={save.isPending}
          onBack={() => setStep((s) => s - 1)}
          onSkip={() => setStep((s) => s + 1)}
          onPrimary={() =>
            footer.primary === 'connect' ? router.push('/owner/integrations') : next()
          }
        />
      }
    >
      <SetupSteps current={step} />
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <View style={styles.stack}>
          <Text variant="display-m" accessibilityRole="header" style={styles.question}>
            {t(`ownerSetup.title.${current}`)}
          </Text>

          {current === 'venue' ? (
            <>
              <SetupField
                label={t('ownerSetup.venueName')}
                value={venueName}
                onChangeText={setName}
                error={err ?? undefined}
              />
              <SetupField
                label={t('ownerSetup.place')}
                value={venuePlace}
                onChangeText={setPlace}
                placeholder={t('ownerSetup.placeHint')}
              />
            </>
          ) : null}

          {current === 'tables' ? (
            <TablesStep
              from={from}
              to={to}
              onFrom={setFrom}
              onTo={setTo}
              plan={plan}
              existing={existing.length}
              error={err}
            />
          ) : null}

          {current === 'wifi' ? (
            <WifiStep value={wifi} onChange={(k, val) => setWifi({ ...wifi, [k]: val })} />
          ) : null}

          {current === 'payments' ? <PaymentsStep paystack={paystack} /> : null}
        </View>
      </DeskWait>
    </SetupFrame>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  question: { marginTop: tokens.space[2], marginBottom: tokens.space[1] },
});
