import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ScanLine, Smartphone, Trash2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { ScannerDevice } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ConfirmDialog, DeskCard, EmptyCard, Field, IconTile, ModalSheet, Toggle } from '../kit';

export function DevicesScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const [pairModalOpen, setPairModalOpen] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<ScannerDevice | null>(null);
  const [scannerModeActive, setScannerModeActive] = useState(false);

  const devicesQuery = useQuery({
    queryKey: ['owner-devices', venueId],
    queryFn: () => api.ownerListScannerDevices(venueId),
    enabled: Boolean(venueId),
  });

  const refresh = () => void client.invalidateQueries({ queryKey: ['owner-devices', venueId] });

  const revokeMutation = useMutation({
    mutationFn: (deviceId: string) => api.ownerRevokeScannerDevice(venueId, deviceId),
    onSuccess: () => {
      setRevokeConfirm(null);
      refresh();
    },
  });

  const items = devicesQuery.data?.items ?? [];

  return (
    <OwnerPage title="Scanner Devices">
      <DeskWait
        loading={devicesQuery.isLoading}
        error={devicesQuery.isError}
        onRetry={() => void devicesQuery.refetch()}
      >
        <View style={styles.stack}>
          {/* Top Actions & Scanner Mode Toggle */}
          <DeskCard style={styles.scannerModeCard}>
            <View style={styles.scannerModeRow}>
              <IconTile icon={ScanLine} tone="tint" size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="title">Staff Scanner Mode</Text>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Locks the device interface exclusively to the camera scanner for floor staff to
                  stamp cards without accessing financial or admin settings.
                </Text>
              </View>

              <Toggle
                value={scannerModeActive}
                onChange={(val) => {
                  setScannerModeActive(val);
                  if (val) {
                    router.push('/owner/scan');
                  }
                }}
                label="Scanner mode"
              />
            </View>
          </DeskCard>

          {/* Action Row */}
          <View style={styles.actionsBar}>
            <View>
              <Text variant="title">Paired Handhelds & Tablets</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                {items.length} device{items.length === 1 ? '' : 's'} authorized to scan
              </Text>
            </View>

            <Button label="Pair new device" tone="primary" onPress={() => setPairModalOpen(true)} />
          </View>

          {items.length === 0 ? (
            <EmptyCard
              icon={Smartphone}
              title="No devices paired yet"
              description="Pair staff smartphones or counter tablets to let waiters scan diner loyalty passes and apply stamps."
              actionLabel="Pair a device now"
              onAction={() => setPairModalOpen(true)}
            />
          ) : (
            <View style={styles.devicesList}>
              {items.map((dev) => (
                <DeskCard key={dev.id} style={styles.deviceCard}>
                  <View style={styles.deviceMainRow}>
                    <IconTile icon={Smartphone} tone="wash" size={36} />

                    <View style={styles.deviceMeta}>
                      <View style={styles.nameStatusRow}>
                        <Text variant="title" style={styles.deviceName}>
                          {dev.name}
                        </Text>
                        <View style={[styles.activePill, { backgroundColor: theme.successTint }]}>
                          <View style={styles.greenDot} />
                          <Text
                            variant="caption"
                            style={{ color: theme.success, fontWeight: '700' }}
                          >
                            Paired
                          </Text>
                        </View>
                      </View>

                      <Text variant="caption" style={{ color: theme.meta }}>
                        Paired on {new Date(dev.pairedAt).toLocaleDateString()} • Last active{' '}
                        {new Date(dev.lastSeen).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Revoke ${dev.name}`}
                      onPress={() => setRevokeConfirm(dev)}
                      style={[styles.revokeBtn, { backgroundColor: theme.errorTint }]}
                    >
                      <Trash2 size={16} color={theme.error} />
                    </Pressable>
                  </View>
                </DeskCard>
              ))}
            </View>
          )}
        </View>

        {/* Pair Device Modal */}
        <PairDeviceModal
          visible={pairModalOpen}
          venueId={venueId}
          onClose={() => setPairModalOpen(false)}
          onPaired={() => {
            setPairModalOpen(false);
            refresh();
          }}
        />

        {/* Revoke Confirm Dialog */}
        <ConfirmDialog
          visible={Boolean(revokeConfirm)}
          title="Revoke Scanner Device"
          message={`Are you sure you want to disconnect "${revokeConfirm?.name}"? It will immediately lose access to scan customer loyalty cards.`}
          confirmLabel="Revoke Device"
          destructive
          loading={revokeMutation.isPending}
          onConfirm={() => {
            if (revokeConfirm) revokeMutation.mutate(revokeConfirm.id);
          }}
          onCancel={() => setRevokeConfirm(null)}
        />
      </DeskWait>
    </OwnerPage>
  );
}

function PairDeviceModal({
  visible,
  venueId,
  onClose,
  onPaired,
}: {
  visible: boolean;
  venueId: string;
  onClose: () => void;
  onPaired: () => void;
}) {
  const theme = useTheme();
  const [deviceName, setDeviceName] = useState('');
  const [pin] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());

  const pairMutation = useMutation({
    mutationFn: () =>
      api.ownerPairScannerDevice(venueId, {
        name: deviceName.trim() || 'Floor Scanner',
        code: pin,
      }),
    onSuccess: onPaired,
  });

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title="Pair Scanner Device"
      subtitle="Connect a floor handheld or staff smartphone using this one-time pairing PIN."
    >
      <View style={modalStyles.stack}>
        <View
          style={[
            modalStyles.pinDisplayCard,
            { backgroundColor: theme.wash, borderColor: theme.line },
          ]}
        >
          <Text
            variant="caption"
            style={{ color: theme.meta, fontWeight: '700', letterSpacing: 1 }}
          >
            ONE-TIME 6-DIGIT PAIRING PIN
          </Text>
          <Text variant="display-m" style={[modalStyles.pinText, { color: theme.fill }]}>
            {pin.slice(0, 3)} {pin.slice(3)}
          </Text>
          <Text variant="caption" style={{ color: theme.meta, textAlign: 'center' }}>
            Open Ozaa on the staff device, select “Staff Scanner Mode”, and enter this 6-digit code.
          </Text>
        </View>

        <Field
          label="Device Name / Location"
          value={deviceName}
          onChangeText={setDeviceName}
          placeholder="e.g. Patio Waiter Handheld #1"
        />

        <Button
          label="Authorize device"
          tone="primary"
          onPress={() => pairMutation.mutate()}
          loading={pairMutation.isPending}
        />
      </View>
    </ModalSheet>
  );
}

const useStyles = makeStyles((theme) => ({
  stack: { gap: tokens.space[4] },
  scannerModeCard: {
    padding: tokens.space[4],
  },
  scannerModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  devicesList: {
    gap: tokens.space[2],
  },
  deviceCard: {
    padding: tokens.space[3],
  },
  deviceMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  deviceMeta: {
    flex: 1,
    gap: 2,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    flexWrap: 'wrap',
  },
  deviceName: {
    fontSize: 16,
    lineHeight: 22,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.success,
  },
  revokeBtn: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

const modalStyles = StyleSheet.create({
  stack: {
    gap: tokens.space[4],
  },
  pinDisplayCard: {
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    padding: tokens.space[5],
    alignItems: 'center',
    gap: tokens.space[2],
  },
  pinText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
