import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ScannerDevice } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { tokens } from '@/theme/tokens';
import { cardStyle, ConfirmDialog, EmptyCard, toast } from '../../kit';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { SectionHead } from '../dashboard/SectionHead';
import { DeviceCard } from './DeviceCard';
import { PairSheet } from './PairSheet';
import { ownerKeys } from '../../data/keys';

/**
 * Scanner devices (design canvas): the paired phones and tablets with a Remove each, then how to
 * pair one in three steps and a button for the one-time code, then what they can do.
 */
export function DevicesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ownerKeys.devices(venueId);
  const devices = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListScannerDevices(venueId),
    enabled: Boolean(venueId),
  });
  const [pairing, setPairing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const [removing, setRemoving] = useState<ScannerDevice | null>(null);

  const revoke = useMutation({
    mutationFn: (id: string) => api.ownerRevokeScannerDevice(venueId, id),
    onSuccess: () => {
      toast.success(t('ownerDevices.removed'));
      setRemoving(null);
      void client.invalidateQueries({ queryKey: key });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  const items = devices.data?.items ?? [];

  return (
    <OwnerPage title={t('owner.devices')} subtitle={t('ownerLead.devices')}>
      <DeskWait
        loading={devices.isLoading}
        error={devices.isError}
        onRetry={() => void devices.refetch()}
      >
        {items.length === 0 ? (
          <EmptyCard
            icon={Smartphone}
            title={t('ownerDevices.empty')}
            description={t('ownerDevices.emptyBody')}
            actionLabel={t('ownerDevices.pair')}
            onAction={() => setPairing(true)}
          />
        ) : (
          <View style={styles.list}>
            <SectionHead
              title={t('ownerDevices.pairedTitle')}
              badge={String(items.length)}
              badgeTone="neutral"
            />
            {items.map((d) => (
              <DeviceCard key={d.id} device={d} now={now} onRemove={() => setRemoving(d)} />
            ))}
          </View>
        )}
        <View style={styles.list}>
          <Text variant="title" accessibilityRole="header">
            {t('ownerDevices.pairTitle')}
          </Text>
          <View style={[cardStyle(theme), styles.pairCard]}>
            {(['step1', 'step2', 'step3'] as const).map((step, i) => (
              <View key={step} style={styles.step}>
                <View style={[styles.num, { backgroundColor: theme.text }]}>
                  <Text style={[styles.numText, { color: theme.surface }]}>{i + 1}</Text>
                </View>
                <Text variant="body" style={styles.flex}>
                  {t(`ownerDevices.${step}`)}
                </Text>
              </View>
            ))}
            <Button
              label={t('ownerDevices.getCode')}
              tone="secondary"
              onPress={() => setPairing(true)}
              style={styles.codeBtn}
            />
          </View>
          <Text style={[styles.note, { color: theme.meta }]}>{t('ownerDevices.footnote')}</Text>
        </View>
      </DeskWait>
      {pairing ? <PairSheet venueId={venueId} onClose={() => setPairing(false)} /> : null}
      <ConfirmDialog
        visible={removing !== null}
        destructive
        title={t('ownerDevices.removeTitle', { name: removing?.name ?? '' })}
        message={t('ownerDevices.removeBody')}
        confirmLabel={t('ownerDevices.remove')}
        loading={revoke.isPending}
        onCancel={() => setRemoving(null)}
        onConfirm={() => removing && revoke.mutate(removing.id)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  list: { gap: tokens.owner.controls.listGap, marginBottom: tokens.space[6] },
  pairCard: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[3] },
  step: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  num: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 13, lineHeight: 16, fontFamily: fontFamily.strong },
  flex: { flex: 1 },
  codeBtn: { alignSelf: 'flex-start', marginTop: tokens.space[2] },
  note: { fontSize: 14, lineHeight: 20 },
});
