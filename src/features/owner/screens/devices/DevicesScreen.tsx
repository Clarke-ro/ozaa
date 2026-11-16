import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ScannerDevice } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { tokens } from '@/theme/tokens';
import { cardStyle, ConfirmDialog, EmptyCard, toast } from '../../kit';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { SectionHead } from '../dashboard/SectionHead';
import { DeviceCard } from './DeviceCard';
import { PairCode } from './PairCode';
import { PairSheet } from './PairSheet';
import { ownerKeys } from '../../data/keys';
import { useNow } from '@/lib/useNow';

/**
 * Scanner devices (design canvas): the paired phones and tablets with a Remove each, then the
 * one-time pairing code beside the three steps, then what scanner devices can do.
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
  const now = useNow(60_000);
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
            <PairCode venueId={venueId} count={items.length} />
            <View style={styles.steps}>
              {(['step1', 'step2', 'step3'] as const).map((step, i) => (
                <View key={step} style={styles.step}>
                  <View style={[styles.num, { backgroundColor: theme.text }]}>
                    <Text style={[styles.numText, { color: theme.surface }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{t(`ownerDevices.${step}`)}</Text>
                </View>
              ))}
            </View>
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
  // Canvas: the code panel on the left, the three numbered steps beside it.
  pairCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[8],
    padding: tokens.owner.controls.cardPadding,
  },
  steps: { flexGrow: 1, flexBasis: 260, gap: tokens.space[5] },
  step: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[4] },
  num: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  numText: { fontSize: 15, lineHeight: 18, fontFamily: fontFamily.strong },
  stepText: { flex: 1, fontSize: 17, lineHeight: 24 },
  note: { fontSize: 15, lineHeight: 22 },
});
