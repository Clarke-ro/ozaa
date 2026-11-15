import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { LoyaltyScanResult } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { useOwnerSession } from '@/features/session';
import { OwnerPage, useGutter } from '../../chrome/OwnerPage';
import { toast } from '../../kit';
import { GuestLookup } from './GuestLookup';
import { ScanLog } from './ScanLog';
import { ScanOnPhone } from './ScanOnPhone';
import { ScanProblem, ScanResult } from './ScanResult';
import { ScanViewfinder } from './ScanViewfinder';
import { ownerKeys } from '../../data/keys';

/**
 * Scan a guest's loyalty QR to add a stamp or give a reward. On a computer (no camera) the page
 * shows a code to open the scanner on a phone. Guests can also be found by name or last 4 digits,
 * and the day's stamps and rewards are listed underneath.
 */
export function ScanStampScreen() {
  const { t } = useTranslation();
  const gutter = useGutter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const program = useQuery({
    queryKey: ownerKeys.loyalty(venueId),
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  // The log covers the last day; worked out once per visit to the page.
  const [since] = useState(() => new Date(Date.now() - 86_400_000).toISOString());
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
      refresh();
    },
    onError: (err: Error) => {
      void hapticWarning();
      setProblem(err.message || t('ownerScan.problemBody'));
    },
  });

  // Customers, Loyalty and the log count the same stamps, so they refresh together.
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ownerKeys.loyalty(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.loyaltyCustomers(venueId) });
    void client.invalidateQueries({ queryKey: ownerKeys.scans(venueId) });
  };
  const stampById = useMutation({
    mutationFn: (customerId: string) =>
      api.ownerStampLoyaltyCustomer(venueId, customerId, { idempotencyKey: crypto.randomUUID() }),
    onSuccess: (data) => {
      setResult(data);
      setProblem(null);
      if (data.cooldownViolated) toast.error(t('ownerMembers.cooldown'));
      refresh();
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const send = (qr: string) => {
    const value = qr.trim();
    if (!value || scan.isPending || (scanned === value && result)) return;
    setScanned(value);
    scan.mutate({ qr: value, action: 'stamp' });
  };

  return (
    <OwnerPage title={t('ownerScan.title')} subtitle={t('ownerLead.scan')}>
      <View style={styles.stack}>
        {Platform.OS === 'web' ? (
          <ScanOnPhone />
        ) : (
          <View>
            <ScanViewfinder gutter={gutter} onScanned={send} />
          </View>
        )}

        <View style={styles.sideCol}>
          <GuestLookup
            venueId={venueId}
            busyId={stampById.isPending ? (stampById.variables ?? null) : null}
            onStamp={(id) => stampById.mutate(id)}
            onCode={send}
          />

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
          <ScanLog venueId={venueId} since={since} />
        </View>
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  sideCol: { gap: tokens.space[4] },
});
