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
import { ConfirmDialog, EmptyCard, SectionLabel, toast } from '../../kit';
import { DeviceCard } from './DeviceCard';
import { PairSheet } from './PairSheet';
import { ownerKeys } from '../../data/keys';

/** Phones and tablets that can scan loyalty cards, each with when it was last used. */
export function DevicesScreen() {
  const { t } = useTranslation();
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
    <OwnerPage
      title={t('owner.devices')} subtitle={t('ownerLead.devices')}
      action={
        <Button
          label={t('ownerDevices.pairShort')}
          tone="secondary"
          size="md"
          onPress={() => setPairing(true)}
        />
      }
    >
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
          <View style={styles.stack}>
            <SectionLabel title={t('ownerDevices.list', { count: items.length })} caps />
            <View style={styles.list}>
              {items.map((d) => (
                <View key={d.id}>
                  <DeviceCard device={d} now={now} onRemove={() => setRemoving(d)} />
                </View>
              ))}
            </View>
          </View>
        )}
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
  stack: { gap: tokens.space[3] },
  list: { gap: tokens.space[3] },
});
