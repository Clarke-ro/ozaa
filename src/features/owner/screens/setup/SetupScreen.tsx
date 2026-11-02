import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { Schemas } from '@/lib/api/types';
import { parsePhone } from '@/lib/phone';
import type { WifiSecurity } from '@/features/venue';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { Chips, Field, Section, SectionBody, toast } from '../../kit';
import { planTables } from '../tables/planTables';
import { WifiSection } from '../services/WifiSection';
import { SetupSteps, STEPS } from './SetupSteps';

type MomoProvider = Schemas['MomoProvider'];
const PROVIDERS: MomoProvider[] = ['mtn', 'vod', 'atl'];

/** First-time setup in four short steps. Each step saves before moving on; Wi-Fi can be skipped. */
export function SetupScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled: Boolean(venueId),
  });
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [name, setName] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [from, setFrom] = useState('1');
  const [to, setTo] = useState('10');
  const [wifi, setWifi] = useState({
    ssid: '',
    password: '',
    security: 'WPA2' as WifiSecurity,
    hidden: false,
  });
  const [business, setBusiness] = useState('');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<MomoProvider | null>(null);

  const v = venue.data;
  const venueName = name ?? v?.name ?? '';
  const venuePlace = place ?? v?.location.label ?? '';
  const parsed = parsePhone(phone);
  // Use the network the number belongs to when the prefix tells us; otherwise the owner picks.
  const network = provider ?? parsed?.provider ?? null;
  const plan = planTables(
    'range',
    { start: from, end: to, prefix: '', list: '' },
    (tables.data?.items ?? []).map((x) => x.code),
  );
  const current = STEPS[step];

  const problem = (): string | null => {
    if (current === 'venue') return venueName.trim() ? null : t('ownerSetup.err.name');
    if (current === 'tables')
      return plan.error && (tables.data?.items.length ?? 0) === 0
        ? t(plan.error, { max: 200 })
        : null;
    if (current === 'payout') {
      if (!parsed) return t('ownerSetup.err.phone');
      if (!network) return t('ownerSetup.err.network');
    }
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
      if (current === 'payout' && parsed && network) {
        await api.ownerSetPayoutAccount(venueId, {
          businessName: business.trim() || venueName.trim(),
          settlement: { type: 'momo', provider: network, phone: parsed.phone },
        });
      }
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
    return (
      <OwnerPage title={t('owner.setup')}>
        <View style={styles.done}>
          <CircleCheck size={48} color={theme.success} />
          <Text variant="title">{t('ownerSetup.doneTitle')}</Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {t('owner.setupDone')}
          </Text>
          <Button label={t('ownerSetup.printQr')} onPress={() => router.push('/owner/tables')} />
          <Button
            label={t('ownerSetup.openFloor')}
            tone="ghost"
            onPress={() => router.push('/owner/floor')}
          />
        </View>
      </OwnerPage>
    );
  }

  return (
    <OwnerPage
      title={t('owner.setup')}
      footer={
        <View style={[styles.bar, { borderTopColor: theme.line, backgroundColor: theme.surface }]}>
          {step > 0 ? (
            <Button
              label={t('owner.back')}
              tone="ghost"
              size="md"
              onPress={() => setStep((s) => s - 1)}
            />
          ) : null}
          {current === 'wifi' ? (
            <Button
              label={t('ownerSetup.skip')}
              tone="ghost"
              size="md"
              onPress={() => setStep((s) => s + 1)}
            />
          ) : null}
          <Button
            label={step === STEPS.length - 1 ? t('owner.finish') : t('owner.next')}
            size="md"
            style={styles.flex}
            loading={save.isPending}
            onPress={next}
          />
        </View>
      }
    >
      <SetupSteps current={step} />
      <DeskWait
        loading={venue.isLoading}
        error={venue.isError}
        onRetry={() => void venue.refetch()}
      >
        <View style={[styles.form, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Text variant="title">{t(`ownerSetup.title.${current}`)}</Text>
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
                    : t('ownerSetup.tablesExist'))}
              </Text>
            </>
          ) : null}
          {current === 'wifi' ? (
            <WifiSection value={wifi} onChange={(k, val) => setWifi((w) => ({ ...w, [k]: val }))} />
          ) : null}
          {current === 'payout' ? (
            <>
              <Field
                label={t('ownerSetup.business')}
                value={business}
                onChangeText={setBusiness}
                placeholder={venueName}
              />
              <Field
                label={t('ownerSetup.momo')}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="024 123 4567"
                error={err === t('ownerSetup.err.phone') ? err : undefined}
              />
              <Section
                title={t('ownerSetup.network')}
                note={err === t('ownerSetup.err.network') ? err : undefined}
              >
                <SectionBody>
                  <Chips
                    single
                    label={t('ownerSetup.network')}
                    options={PROVIDERS.map((id) => ({
                      id,
                      label: t(`ownerPayments.providers.${id}`),
                    }))}
                    selected={network ? [network] : []}
                    onChange={(ids) => setProvider(ids[0] ?? null)}
                  />
                </SectionBody>
              </Section>
            </>
          ) : null}
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: tokens.space[4],
    padding: tokens.space[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: tokens.space[3] },
  bar: {
    flexDirection: 'row',
    gap: tokens.space[2],
    padding: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  done: { alignItems: 'center', gap: tokens.space[3], paddingVertical: tokens.space[8] },
  center: { textAlign: 'center' },
});
