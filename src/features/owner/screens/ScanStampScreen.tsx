import { makeStyles } from '@/ui/makeStyles';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Award, Camera, CheckCircle2, X } from 'lucide-react-native';
import { api } from '@/lib/api';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import type { LoyaltyScanResult } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile } from '../kit';

export function ScanStampScreen() {
  const styles = useStyles();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  // The owner's own target, not a fixed 10.
  const program = useQuery({
    queryKey: ['owner-loyalty', venueId],
    queryFn: () => api.ownerGetLoyalty(venueId),
    enabled: Boolean(venueId),
  });
  const target = program.data?.stampsRequired ?? 10;

  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<LoyaltyScanResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const scanMutation = useMutation({
    mutationFn: ({ code, action }: { code: string; action: 'stamp' | 'redeem' }) =>
      api.ownerScanLoyaltyCard(venueId, { qrPayload: code, action }),
    onSuccess: (data) => {
      setScanResult(data);
      setErrorMessage(null);
      if (data.cooldownViolated) {
        void hapticWarning();
      } else {
        void hapticSuccess();
      }
      void client.invalidateQueries({ queryKey: ['owner-loyalty', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-loyalty-customers', venueId] });
    },
    onError: (err: Error) => {
      void hapticWarning();
      setErrorMessage(err.message || 'Cooldown active or card invalid.');
    },
  });

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanMutation.isPending || (scannedCode === data && scanResult)) return;
    setScannedCode(data);
    scanMutation.mutate({ code: data, action: 'stamp' });
  };

  const handleManualSubmit = (action: 'stamp' | 'redeem' = 'stamp') => {
    if (!manualCode.trim()) return;
    setScannedCode(manualCode.trim());
    scanMutation.mutate({ code: manualCode.trim(), action });
  };

  const member = scanResult?.card?.member;
  const displayName = member?.firstName || member?.phoneMasked || 'Loyalty Member';

  return (
    <OwnerPage title="Scan & Stamp">
      <View style={styles.stack}>
        {/* Camera Viewfinder (Native & Web supported) */}
        <DeskCard style={styles.cameraCard}>
          <View style={styles.cardHeader}>
            <IconTile icon={Camera} tone="tint" size={36} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Scan a guest card</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Point the camera at the QR code on the guest’s phone.
              </Text>
            </View>
          </View>

          {Platform.OS === 'web' ? (
            // Camera scanning is only wired up in the phone app; say so instead of showing a fake viewfinder.
            <View style={[styles.permissionBox, { backgroundColor: theme.wash }]}>
              <Camera size={32} color={theme.muted} />
              <Text variant="body-strong">Use the code below on a computer</Text>
              <Text variant="body" style={{ color: theme.muted, textAlign: 'center' }}>
                Camera scanning works in the Ozaa app on a phone. Here, type the code shown under
                the guest’s QR card.
              </Text>
            </View>
          ) : !permission || !permission.granted ? (
            <View style={styles.permissionBox}>
              <Camera size={36} color={theme.meta} />
              <Text variant="body-strong">Camera access required</Text>
              <Text variant="caption" style={{ color: theme.meta, textAlign: 'center' }}>
                Enable camera permissions to scan diner loyalty QR cards instantly.
              </Text>
              <Button label="Allow camera" onPress={requestPermission} tone="primary" />
            </View>
          ) : (
            <View style={styles.viewfinderContainer}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                onBarcodeScanned={handleBarcodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
              />

              {/* Viewfinder Target Reticle */}
              <View style={styles.reticleOverlay}>
                <View style={[styles.reticleCorner, styles.tl]} />
                <View style={[styles.reticleCorner, styles.tr]} />
                <View style={[styles.reticleCorner, styles.bl]} />
                <View style={[styles.reticleCorner, styles.br]} />
              </View>
            </View>
          )}

          {/* Manual Code / Phone Fallback Form */}
          <View style={styles.manualSection}>
            <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
              OR TYPE THE CODE
            </Text>
            <View style={styles.manualRow}>
              <TextInput
                accessibilityLabel="Guest phone number or card code"
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => manualCode.trim() && handleManualSubmit('stamp')}
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="e.g. +233240000001 or CARD-123"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
              <Button
                label="Add stamp"
                tone="primary"
                onPress={() => handleManualSubmit('stamp')}
                loading={scanMutation.isPending}
                disabled={!manualCode.trim()}
              />
            </View>
          </View>
        </DeskCard>

        {/* Scan Result Celebration or Cooldown Alert */}
        {scanResult ? (
          <DeskCard
            style={[
              styles.resultCard,
              { borderColor: theme.success, backgroundColor: theme.successTint },
            ]}
          >
            <View style={styles.resultHeader}>
              <CheckCircle2 size={24} color={theme.success} />
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: theme.success }}>
                  {displayName}
                </Text>
                <Text variant="caption" style={{ color: theme.success }}>
                  {scanResult.message}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close result"
                onPress={() => setScanResult(null)}
                style={styles.closeHit}
              >
                <X size={18} color={theme.success} />
              </Pressable>
            </View>

            <View style={styles.stampsCountRow}>
              <View style={styles.stampNumberBadge}>
                <Award size={18} color={theme.onFill} />
                <Text variant="display-m" style={{ color: theme.onFill, marginLeft: 6 }}>
                  {scanResult.stamps}
                </Text>
              </View>
              <View>
                <Text variant="body-strong" style={{ color: theme.success }}>
                  Stamps so far
                </Text>
                <Text variant="caption" style={{ color: theme.success }}>
                  {scanResult.stamps >= target
                    ? 'Reward unlocked. Ready to claim.'
                    : `${target - (scanResult.stamps % target)} more for the next reward`}
                </Text>
              </View>
            </View>

            {/* Redeem Reward Button if Ready */}
            {scanResult.stamps >= target ? (
              <Button
                label="Redeem Reward Free Food"
                tone="primary"
                onPress={() =>
                  scannedCode && scanMutation.mutate({ code: scannedCode, action: 'redeem' })
                }
                loading={scanMutation.isPending}
              />
            ) : null}
          </DeskCard>
        ) : null}

        {/* Error / Cooldown Warning Alert */}
        {errorMessage ? (
          <DeskCard
            style={[
              styles.errorCard,
              { borderColor: theme.warning, backgroundColor: theme.warningTint },
            ]}
          >
            <View style={styles.resultHeader}>
              <AlertTriangle size={24} color={theme.warning} />
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: theme.warning }}>
                  Stamp Cooldown Active
                </Text>
                <Text variant="caption" style={{ color: theme.warning }}>
                  {errorMessage}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close message"
                onPress={() => setErrorMessage(null)}
                hitSlop={13}
              >
                <X size={18} color={theme.warning} />
              </Pressable>
            </View>
          </DeskCard>
        ) : null}
      </View>
    </OwnerPage>
  );
}

const useStyles = makeStyles((theme) => ({
  closeHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -10,
    marginTop: -10,
  },
  stack: { gap: tokens.space[4] },
  cameraCard: {
    padding: tokens.space[4],
    gap: tokens.space[4],
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  permissionBox: {
    padding: tokens.space[6],
    borderRadius: tokens.radius.md,
    backgroundColor: theme.wash,
    alignItems: 'center',
    gap: tokens.space[3],
  },
  viewfinderContainer: {
    height: 280,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.black,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reticleOverlay: {
    width: 180,
    height: 180,
    position: 'relative',
  },
  reticleCorner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: theme.fill,
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  manualSection: {
    gap: tokens.space[2],
  },
  manualRow: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    backgroundColor: theme.surface,
    fontSize: 14,
  },
  resultCard: {
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    gap: tokens.space[3],
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.space[3],
  },
  stampsCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: tokens.space[2],
  },
  stampNumberBadge: {
    backgroundColor: theme.success,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorCard: {
    padding: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
    gap: tokens.space[2],
  },
}));
