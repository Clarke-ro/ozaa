import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { LoyaltyScanResult } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OwnerPage, useGutter } from '../chrome/OwnerPage';
import { ScanProblem, ScanResult } from './scan/ScanResult';
import { ScanViewfinder } from './scan/ScanViewfinder';
import { ownerKeys } from '../data/keys';

/** Scan a guest's loyalty QR (or type its code) to add a stamp or redeem a reward. */
export function ScanStampScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const gutter = useGutter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  // The owner's own target. Until it loads, the result card shows the count without "N more".
  const program = useQuery({
    queryKey: ownerKeys.loyalty(venueId),
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  const [code, setCode] = useState('');
  const [result, setResult] = useState<LoyaltyScanResult | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string | null>(null);

  const scan = useMutation({
    mutationFn: ({ qr, action }: { qr: string; action: 'stamp' | 'redeem' }) =>
      api.ownerScanLoyaltyCard(venueId, { qrPayload: qr, action }),
    onSuccess: (data) => {
      setResult(data);
      setProblem(null);
      void (data.cooldownViolated ? hapticWarning() : hapticSuccess());
      void client.invalidateQueries({ queryKey: ownerKeys.loyalty(venueId) });
      void client.invalidateQueries({ queryKey: ownerKeys.loyaltyCustomers(venueId) });
    },
    onError: (err: Error) => {
      void hapticWarning();
      setProblem(err.message || t('ownerScan.problemBody'));
    },
  });

  const send = (qr: string) => {
    const value = qr.trim();
    if (!value || scan.isPending || (scanned === value && result)) return;
    setScanned(value);
    scan.mutate({ qr: value, action: 'stamp' });
  };

  return (
    <OwnerPage title={t('ownerScan.title')}>
      <View style={styles.stack}>
        <ScanViewfinder gutter={gutter} onScanned={send} />

        {result ? (
          <ScanResult
            result={result}
            target={program.data?.stampsRequired}
            busy={scan.isPending}
            onRedeem={() => scanned && scan.mutate({ qr: scanned, action: 'redeem' })}
            onClose={() => setResult(null)}
          />
        ) : null}
        {problem ? <ScanProblem message={problem} onClose={() => setProblem(null)} /> : null}

        <View style={styles.manual}>
          <Text variant="caption" style={{ color: theme.meta, fontFamily: fontFamily.strong }}>
            {t('ownerScan.typeCode')}
          </Text>
          <View style={styles.row}>
            <TextInput
              accessibilityLabel={t('ownerScan.codeLabel')}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              value={code}
              onChangeText={setCode}
              onSubmitEditing={() => send(code)}
              placeholder={t('ownerScan.codeHint')}
              placeholderTextColor={theme.meta}
              style={[
                styles.input,
                { borderColor: theme.line, color: theme.text, backgroundColor: theme.surface },
              ]}
            />
            <Button
              label={t('ownerScan.addStamp')}
              tone="primary"
              size="md"
              onPress={() => send(code)}
              loading={scan.isPending}
              disabled={!code.trim()}
            />
          </View>
        </View>
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  manual: { gap: tokens.space[2] },
  row: { flexDirection: 'row', gap: tokens.space[2] },
  input: {
    flex: 1,
    minHeight: tokens.touchTarget,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
});
