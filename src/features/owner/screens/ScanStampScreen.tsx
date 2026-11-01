import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Award,
  Camera,
  CheckCircle2,
  Clock,
  Gift,
  HelpCircle,
  QrCode,
  ScanLine,
  Sparkles,
  X,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import type { LoyaltyScanResult } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../chrome/OwnerPage';
import { DeskCard, IconTile, SectionLabel } from '../kit';

export function ScanStampScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

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
      void client.invalidateQueries({ queryKey: ['owner-loyalty', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-loyalty-customers', venueId] });
    },
    onError: (err: any) => {
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
    <OwnerPage
      title="Scan & Stamp"
      subtitle="Point camera at guest loyalty card or enter phone number to award stamps and redeem treats."
    >
      <View style={styles.stack}>
        {/* Camera Viewfinder (Native & Web supported) */}
        <DeskCard style={styles.cameraCard}>
          <View style={styles.cardHeader}>
            <IconTile icon={Camera} tone="tint" size={36} />
            <View style={{ flex: 1 }}>
              <Text variant="title">Diner Camera Scanner</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Position customer QR code inside viewfinder frame
              </Text>
            </View>
          </View>

          {Platform.OS !== 'web' && (!permission || !permission.granted) ? (
            <View style={styles.permissionBox}>
              <Camera size={36} color={theme.meta} />
              <Text variant="body-strong">Camera access required</Text>
              <Text variant="caption" style={{ color: theme.meta, textAlign: 'center' }}>
                Enable camera permissions to scan diner loyalty QR cards instantly.
              </Text>
              <Button label="Grant Camera Permission" onPress={requestPermission} tone="primary" />
            </View>
          ) : (
            <View style={styles.viewfinderContainer}>
              {Platform.OS !== 'web' ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                />
              ) : (
                <View style={[styles.webCameraMock, { backgroundColor: '#111111' }]}>
                  <ScanLine size={48} color="#FFFFFF" />
                  <Text variant="caption" style={{ color: '#FFFFFF', textAlign: 'center' }}>
                    Web Camera Active • Ready to scan QR code
                  </Text>
                </View>
              )}

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
              MANUAL PHONE / CODE INPUT
            </Text>
            <View style={styles.manualRow}>
              <TextInput
                value={manualCode}
                onChangeText={setManualCode}
                placeholder="e.g. +233240000001 or CARD-123"
                placeholderTextColor={theme.meta}
                style={[styles.input, { borderColor: theme.line, color: theme.text }]}
              />
              <Button
                label="+1 Stamp"
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
          <DeskCard style={[styles.resultCard, { borderColor: theme.success, backgroundColor: '#F0FDF4' }]}>
            <View style={styles.resultHeader}>
              <CheckCircle2 size={24} color="#16A34A" />
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: '#166534' }}>
                  {displayName}
                </Text>
                <Text variant="caption" style={{ color: '#15803D' }}>
                  {scanResult.message}
                </Text>
              </View>
              <Pressable onPress={() => setScanResult(null)} hitSlop={8}>
                <X size={18} color="#15803D" />
              </Pressable>
            </View>

            <View style={styles.stampsCountRow}>
              <View style={styles.stampNumberBadge}>
                <Award size={18} color="#FFFFFF" />
                <Text variant="display-m" style={{ color: '#FFFFFF', marginLeft: 6 }}>
                  {scanResult.stamps}
                </Text>
              </View>
              <View>
                <Text variant="body-strong" style={{ color: '#166534' }}>
                  Total Stamps Collected
                </Text>
                <Text variant="caption" style={{ color: '#15803D' }}>
                  {scanResult.stamps >= 10
                    ? '🎉 Reward Unlocked & Ready to Claim!'
                    : `${10 - (scanResult.stamps % 10)} stamps until next reward`}
                </Text>
              </View>
            </View>

            {/* Redeem Reward Button if Ready */}
            {scanResult.stamps >= 10 ? (
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
          <DeskCard style={[styles.errorCard, { borderColor: '#F59E0B', backgroundColor: '#FEF3C7' }]}>
            <View style={styles.resultHeader}>
              <AlertTriangle size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <Text variant="title" style={{ color: '#92400E' }}>
                  Stamp Cooldown Active
                </Text>
                <Text variant="caption" style={{ color: '#B45309' }}>
                  {errorMessage}
                </Text>
              </View>
              <Pressable onPress={() => setErrorMessage(null)} hitSlop={8}>
                <X size={18} color="#92400E" />
              </Pressable>
            </View>
          </DeskCard>
        ) : null}
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#F4F4F5',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  viewfinderContainer: {
    height: 280,
    borderRadius: tokens.radius.lg,
    overflow: 'hidden',
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  webCameraMock: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.space[3],
    padding: tokens.space[4],
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
    borderColor: '#FC5205',
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
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#16A34A',
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
});
