import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { Field, cardStyle, toast } from '../../kit';
import { planTables } from '../tables/planTables';
import { WifiSection, type WifiForm } from '../services/WifiSection';
import { SetupDone } from './SetupDone';
import { SetupFooter } from './SetupFooter';
import { SetupSteps } from './SetupSteps';
import { STEPS, footerFor, setupSummary, type Step } from './setupFlow';

/**
 * First-time setup in four short steps, then a summary. Each step saves before moving on.
 * Wi-Fi and online payments can be skipped: guests can always pay in person.
 */
export function SetupScreen() {
  const theme = useTheme();
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
      <OwnerPage title={t('owner.setup')}>
        <SetupDone rows={rows} onEdit={(target) => setStep(STEPS.indexOf(target))} />
      </OwnerPage>
    );
  }

  const footer = footerFor(current, paystack);
  return (
    <OwnerPage
      title={t('owner.setup')}
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
        <View style={[styles.card, cardStyle(theme)]}>
          <View style={styles.head}>
            <Text variant="caption" style={{ color: theme.muted, fontFamily: fontFamily.strong }}>
              {t('ownerSetup.progress', { step: step + 1, total: STEPS.length })}
            </Text>
            <Text variant="display-m" accessibilityRole="header">
              {t(`ownerSetup.title.${current}`)}
            </Text>
            <Text variant="body" style={{ color: theme.muted }}>
              {t(`ownerSetup.lead.${current}`)}
            </Text>
          </View>

          {current === 'venue' ? (
            <>
              <Field
                label={t('ownerSetup.venueName')}
                value={venueName}
                onChangeText={setName}
                error={err ?? undefined}
              />
              <Field
                label={t('ownerSetup.place')}
                value={venuePlace}
                onChangeText={setPlace}
                placeholder={t('ownerSetup.placeHint')}
              />
            </>
          ) : null}

          {current === 'tables' ? (
            <>
              <View style={styles.row}>
                <Field
                  label={t('ownerTables.from')}
                  value={from}
                  onChangeText={setFrom}
                  keyboardType="number-pad"
                />
                <Field
                  label={t('ownerTables.to')}
                  value={to}
                  onChangeText={setTo}
                  keyboardType="number-pad"
                />
              </View>
              <Text variant="caption" style={{ color: err ? theme.error : theme.muted }}>
                {err ??
                  (plan.codes.length
                    ? t('ownerTables.willCreate', {
                        count: plan.codes.length,
                        first: plan.codes[0],
                        last: plan.codes.at(-1),
                      })
                    : t('ownerSetup.tablesExist', { count: existing.length }))}
              </Text>
            </>
          ) : null}

          {current === 'wifi' ? (
            <WifiSection
              bare
              value={wifi}
              onChange={(k, val) => setWifi({ ...wifi, [k]: val })}
            />
          ) : null}

          {current === 'payments' && paystack ? (
            <View style={[styles.note, { backgroundColor: theme.wash }]}>
              <CircleCheck size={20} color={theme.success} />
              <Text variant="body" style={styles.flex}>
                {t('ownerSetup.connectedNote')}
              </Text>
            </View>
          ) : null}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  card: { gap: tokens.space[5], padding: tokens.space[5] },
  head: { gap: tokens.space[1] },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
  },
  flex: { flex: 1 },
});
