import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ScannerDevice } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ConfirmDialog, EmptyCard, LinkRow, Section, toast } from '../../kit';
import { PairSheet } from './PairSheet';

/** Phones that can scan loyalty cards. Tap one to remove it. */
export function DevicesScreen() {
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const key = ['owner-devices', venueId];
  const devices = useQuery({
    queryKey: key,
    queryFn: () => api.ownerListScannerDevices(venueId),
    enabled: Boolean(venueId),
  });
  const [pairing, setPairing] = useState(false);
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
  const seen = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <OwnerPage
      title={t('owner.devices')}
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
          <Section
            title={t('ownerDevices.list', { count: items.length })}
            note={t('ownerDevices.listNote')}
          >
            {items.map((d) => (
              <LinkRow
                key={d.id}
                icon={Smartphone}
                label={d.name}
                value={t('ownerDevices.lastSeen', { when: seen(d.lastSeen) })}
                onPress={() => setRemoving(d)}
              />
            ))}
          </Section>
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
