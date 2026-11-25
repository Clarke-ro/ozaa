import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LIVE_PAYMENTS_ENABLED } from '@/lib/features';
import { checkPaystackKeys } from '@/lib/payments';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait } from '../../../chrome/OwnerPage';
import { ConfirmDialog, InfoRow, Section, SectionBody } from '../../../kit';
import { PaystackKeysForm } from '../PaystackKeysForm';
import { usePayments } from '../usePayments';
import type { PageProps } from './IntegrationPage';

/**
 * Paystack's page, in the app's settings cards: the keys while not connected; once connected, the
 * account (public key and the secret's last 4 only), Test and Disconnect. The secret is typed here once, sent to the
 * server to be checked and stored encrypted, then cleared: it is never kept on this device.
 */
export function PaystackPage({ venueId, done }: PageProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const pay = usePayments(venueId);
  const [mode, setMode] = useState<'test' | 'live'>('test');
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [tried, setTried] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const check = checkPaystackKeys({ mode, publicKey, secretKey }, LIVE_PAYMENTS_ENABLED);
  const paystack = pay.settings.data?.paystack ?? null;
  const result = pay.testPaystack.data;

  return (
    <DeskWait
      loading={pay.settings.isPending}
      error={pay.settings.isError}
      onRetry={() => void pay.settings.refetch()}
    >
      {paystack ? (
        <Section title={t('ownerPay.account')}>
          <InfoRow
            label={t('ownerPay.connectedOn')}
            value={new Date(paystack.connectedAt).toLocaleDateString(i18n.language)}
          />
          <InfoRow label={t('ownerPay.publicKey')} value={paystack.publicKey} />
          <InfoRow label={t('ownerPay.secretKey')} value={paystack.secretKeyHint} />
          <SectionBody>
            {result ? (
              <Text
                variant="caption"
                accessibilityRole="alert"
                style={{ color: result.ok ? theme.success : theme.error }}
              >
                {result.ok ? t('ownerPay.testOk') : (result.message ?? t('ownerPay.testFailed'))}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <Button
                label={t('ownerPay.disconnect')}
                tone="ghost"
                size="md"
                onPress={() => setConfirming(true)}
              />
              <Button
                label={t('ownerPay.test')}
                tone="secondary"
                size="md"
                loading={pay.testPaystack.isPending}
                onPress={() => pay.testPaystack.mutate()}
              />
            </View>
          </SectionBody>
        </Section>
      ) : (
        <Section title={t('ownerPay.keysTitle')}>
          <SectionBody>
            <PaystackKeysForm
              mode={mode}
              onMode={setMode}
              publicKey={publicKey}
              onPublicKey={setPublicKey}
              secretKey={secretKey}
              onSecretKey={setSecretKey}
              error={tried && !check.ok ? t(`ownerPay.err.${check.code}`) : undefined}
              connecting={pay.connectPaystack.isPending}
              onConnect={() =>
                check.ok
                  ? pay.connectPaystack.mutate(
                      { mode, publicKey: publicKey.trim(), secretKey: secretKey.trim() },
                      {
                        // Forget the secret straight away; the server has it now.
                        onSuccess: () => {
                          setSecretKey('');
                          done();
                        },
                      },
                    )
                  : setTried(true)
              }
            />
          </SectionBody>
        </Section>
      )}
      <ConfirmDialog
        visible={confirming}
        destructive
        title={t('ownerPay.disconnectTitle')}
        message={t('ownerPay.disconnectBody')}
        confirmLabel={t('ownerPay.disconnect')}
        loading={pay.disconnectPaystack.isPending}
        onConfirm={() =>
          pay.disconnectPaystack.mutate(undefined, {
            onSuccess: () => {
              setConfirming(false);
              done();
            },
          })
        }
        onCancel={() => setConfirming(false)}
      />
    </DeskWait>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: tokens.space[2],
  },
});
