import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import type { PaymentSettings } from '@/lib/api/types';
import { LIVE_PAYMENTS_ENABLED } from '@/lib/features';
import { checkPaystackKeys } from '@/lib/payments';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import {
  ConfirmDialog,
  Field,
  Section,
  SectionBody,
  Segmented,
  StatusPill,
  toast,
} from '../../kit';

// Where owners find their keys in the Paystack dashboard (Settings → API Keys & Webhooks).
const PAYSTACK_KEYS_URL = 'https://dashboard.paystack.com/#/settings/developers';

/**
 * The venue's own Paystack account. Money goes straight to it; Ozaa never holds it. The secret
 * key is typed here once, sent to the server to be checked and stored encrypted, then cleared:
 * it is never kept on this device or shown again (only its last 4 characters).
 */
export function PaystackCard({
  venueId,
  settings,
}: {
  venueId: string;
  settings: PaymentSettings;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const refresh = (next: PaymentSettings) =>
    client.setQueryData(ownerKeys.paymentSettings(venueId), next);

  const check = checkPaystackKeys({ mode, publicKey, secretKey }, LIVE_PAYMENTS_ENABLED);
  const connect = useMutation({
    mutationFn: () =>
      api.ownerConnectPaystack(venueId, {
        mode,
        publicKey: publicKey.trim(),
        secretKey: secretKey.trim(),
      }),
    onSuccess: (next) => {
      // Forget the secret straight away; the server has it now.
      setSecretKey('');
      setPublicKey('');
      setTried(false);
      refresh(next);
      toast.success(t('ownerPay.connected'));
    },
    onError: (error) => toast.error(t(toMessageKey(error))),
  });
  const disconnect = useMutation({
    mutationFn: () => api.ownerDisconnectPaystack(venueId),
    onSuccess: (next) => {
      setConfirming(false);
      setTestResult(null);
      refresh(next);
    },
    onError: (error) => toast.error(t(toMessageKey(error))),
  });
  const test = useMutation({
    mutationFn: () => api.ownerTestPaystack(venueId),
    onSuccess: (result) => setTestResult(result),
    onError: (error) => toast.error(t(toMessageKey(error))),
  });

  const paystack = settings.paystack;
  if (paystack) {
    const since = new Date(paystack.connectedAt).toLocaleDateString(i18n.language);
    return (
      <Section title={t('ownerPay.paystack')} note={t('ownerPay.ownAccount')}>
        <SectionBody>
          <View style={styles.stack}>
            <View style={styles.row}>
              <CircleCheck size={20} color={theme.success} />
              <Text variant="body-strong" style={styles.flex}>
                {t('ownerPay.isConnected', { date: since })}
              </Text>
              <StatusPill
                label={paystack.mode === 'test' ? t('ownerPay.testMode') : t('ownerPay.liveMode')}
                tone={paystack.mode === 'test' ? 'waiting' : 'success'}
                boxed
              />
            </View>
            <Text variant="caption" style={{ color: theme.muted }} selectable>
              {t('ownerPay.publicKey')}: {paystack.publicKey}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerPay.secretKey')}: {paystack.secretKeyHint}
            </Text>
            {testResult ? (
              <Text
                variant="caption"
                accessibilityRole="alert"
                style={{ color: testResult.ok ? theme.success : theme.error }}
              >
                {testResult.ok
                  ? t('ownerPay.testOk')
                  : (testResult.message ?? t('ownerPay.testFailed'))}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('ownerPay.test')}
                tone="secondary"
                size="md"
                loading={test.isPending}
                onPress={() => test.mutate()}
              />
              <Button
                label={t('ownerPay.disconnect')}
                tone="ghost"
                size="md"
                onPress={() => setConfirming(true)}
              />
            </View>
          </View>
        </SectionBody>
        <ConfirmDialog
          visible={confirming}
          destructive
          title={t('ownerPay.disconnectTitle')}
          message={t('ownerPay.disconnectBody')}
          confirmLabel={t('ownerPay.disconnect')}
          loading={disconnect.isPending}
          onConfirm={() => disconnect.mutate()}
          onCancel={() => setConfirming(false)}
        />
      </Section>
    );
  }

  const error = tried && !check.ok ? t(`ownerPay.err.${check.code}`) : undefined;
  return (
    <Section title={t('ownerPay.paystack')} note={t('ownerPay.ownAccount')}>
      <SectionBody>
        <View style={styles.stack}>
          <Text variant="body-strong">{t('ownerPay.whereTitle')}</Text>
          {(['step1', 'step2', 'step3'] as const).map((step, index) => (
            <Text key={step} variant="caption" style={{ color: theme.muted }}>
              {index + 1}. {t(`ownerPay.${step}`)}
            </Text>
          ))}
          <Button
            label={t('ownerPay.openPaystack')}
            tone="ghost"
            size="md"
            onPress={() => void Linking.openURL(PAYSTACK_KEYS_URL)}
          />
          <Segmented
            label={t('ownerPay.mode')}
            value={mode}
            onChange={setMode}
            options={[
              { id: 'test', label: t('ownerPay.testMode') },
              { id: 'live', label: t('ownerPay.liveMode') },
            ]}
          />
          <Text variant="caption" style={{ color: theme.meta }}>
            {mode === 'test' ? t('ownerPay.testHint') : t('ownerPay.liveOff')}
          </Text>
          <Field
            label={t('ownerPay.publicKey')}
            value={publicKey}
            onChangeText={setPublicKey}
            placeholder={mode === 'test' ? 'pk_test_…' : 'pk_live_…'}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label={t('ownerPay.secretKey')}
            hint={t('ownerPay.secretHint')}
            value={secretKey}
            onChangeText={setSecretKey}
            placeholder={mode === 'test' ? 'sk_test_…' : 'sk_live_…'}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="off"
            secureTextEntry
            error={error}
          />
          <Button
            label={t('ownerPay.connect')}
            loading={connect.isPending}
            onPress={() => (check.ok ? connect.mutate() : setTried(true))}
          />
        </View>
      </SectionBody>
    </Section>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
