import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
import { guestKeys } from '@/lib/queryKeys';
import { ownerKeys } from '../../data/keys';
import { ConfirmDialog, toast } from '../../kit';
import { PaystackKeysForm } from './PaystackKeysForm';
import { PaystackLogo } from './BrandLogos';
import { IntegrationCard } from './IntegrationCard';

/**
 * The venue's own Paystack account. Money goes straight to it; Cravins never holds it. The secret
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
  const [opening, setOpening] = useState(false);
  // Bumped after connecting, so the card closes back to its row.
  const [closeSignal, setCloseSignal] = useState(0);
  const [testResult, setTestResult] = useState<{ ok: boolean; message?: string } | null>(null);
  // payMethods on the venue (Pay switch, QR card line, Mark paid methods) follow these settings.
  const refresh = (next: PaymentSettings) => {
    client.setQueryData(ownerKeys.paymentSettings(venueId), next);
    void client.invalidateQueries({ queryKey: ownerKeys.venue(venueId) });
    void client.invalidateQueries({ queryKey: guestKeys.venueAll() });
  };

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
      setOpening(false);
      refresh(next);
      setCloseSignal((n) => n + 1);
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
  // The switch opens the key form while not connected; once connected, off asks to disconnect.
  const on = Boolean(paystack) || opening;
  const onToggle = (next: boolean) => {
    if (paystack) {
      if (!next) setConfirming(true);
      return;
    }
    setOpening(next);
  };
  const status = paystack
    ? t('ownerPay.connectedMode', {
        mode: paystack.mode === 'test' ? t('ownerPay.testMode') : t('ownerPay.liveMode'),
      })
    : t('ownerPay.notConnected');
  const error = tried && !check.ok ? t(`ownerPay.err.${check.code}`) : undefined;

  return (
    <IntegrationCard
      logo={<PaystackLogo />}
      title={t('ownerPay.paystack')}
      subtitle={t('ownerPay.ownAccount')}
      status={status}
      on={on}
      onToggle={onToggle}
      closeSignal={closeSignal}
    >
      {paystack ? (
        <View style={styles.stack}>
          <View style={styles.row}>
            <CircleCheck size={20} color={theme.success} />
            <Text variant="body-strong" style={styles.flex}>
              {t('ownerPay.isConnected', {
                date: new Date(paystack.connectedAt).toLocaleDateString(i18n.language),
              })}
            </Text>
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
      ) : (
        <PaystackKeysForm
          mode={mode}
          onMode={setMode}
          publicKey={publicKey}
          onPublicKey={setPublicKey}
          secretKey={secretKey}
          onSecretKey={setSecretKey}
          error={error}
          connecting={connect.isPending}
          onConnect={() => (check.ok ? connect.mutate() : setTried(true))}
        />
      )}
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
    </IntegrationCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[2] },
});
