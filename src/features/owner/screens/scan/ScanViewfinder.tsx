import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { Camera } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// A phone held upright is about 9:16, so the frame matches what the camera sees.
const RATIO = 9 / 16;
// The target square is most of the frame's width, so a QR held at arm's length fills it.
const TARGET_SHARE = 0.68;

/**
 * The 9:16 scan frame. Native shows the live camera with a target square; the web (no camera
 * scanning) shows the same frame with a note to type the code instead, so the layout matches.
 */
export function ScanViewfinder({
  gutter,
  onScanned,
}: {
  gutter: number;
  onScanned: (code: string) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  // Nearly edge to edge: the page gutter is the only side margin; the code field sits below.
  const frameWidth = width - gutter * 2;
  const frameHeight = frameWidth / RATIO;
  const target = frameWidth * TARGET_SHARE;
  const web = Platform.OS === 'web';
  const live = !web && permission?.granted;

  return (
    <View
      style={[
        styles.frame,
        {
          width: frameWidth,
          height: frameHeight,
          borderColor: theme.line,
          backgroundColor: live ? theme.black : theme.surface,
        },
      ]}
    >
      {live ? (
        <>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={({ data }) => onScanned(data)}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />
          <View
            accessible
            accessibilityLabel={t('ownerScan.aim')}
            style={{ width: target, height: target }}
          >
            <View style={[styles.corner, styles.tl, { borderColor: theme.fill }]} />
            <View style={[styles.corner, styles.tr, { borderColor: theme.fill }]} />
            <View style={[styles.corner, styles.bl, { borderColor: theme.fill }]} />
            <View style={[styles.corner, styles.br, { borderColor: theme.fill }]} />
          </View>
          <Text variant="caption" style={[styles.hint, { color: theme.white }]}>
            {t('ownerScan.aim')}
          </Text>
        </>
      ) : (
        <View style={styles.note}>
          <View style={styles.noteIcon}>
            <Camera size={28} color={theme.ink} />
          </View>
          <Text variant="title" style={styles.center}>
            {web ? t('ownerScan.webTitle') : t('ownerScan.permissionTitle')}
          </Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {web ? t('ownerScan.webBody') : t('ownerScan.permissionBody')}
          </Text>
          {web ? null : (
            <Button
              label={t('ownerScan.allow')}
              tone="secondary"
              size="md"
              onPress={() => void requestPermission()}
            />
          )}
        </View>
      )}
    </View>
  );
}

const CORNER = 28;
const STROKE = 2;

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.xl,
    borderCurve: 'continuous',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: STROKE, borderLeftWidth: STROKE },
  tr: { top: 0, right: 0, borderTopWidth: STROKE, borderRightWidth: STROKE },
  bl: { bottom: 0, left: 0, borderBottomWidth: STROKE, borderLeftWidth: STROKE },
  br: { bottom: 0, right: 0, borderBottomWidth: STROKE, borderRightWidth: STROKE },
  hint: { position: 'absolute', bottom: tokens.space[6] },
  note: { alignItems: 'center', gap: tokens.space[3], padding: tokens.space[6] },
  noteIcon: {
    width: 64,
    height: 64,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
