import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Smartphone } from 'lucide-react-native';
import { env } from '@/lib/env';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { QrImage } from '../tables/QrImage';

const QR = 132;

/**
 * A computer has no camera to scan with, so instead of a dead viewfinder: a code that opens this
 * scanner on a phone, and the way to pair a scanner phone for the counter.
 */
export function ScanOnPhone() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={[cardStyle(theme), styles.card]}>
      <View style={[styles.qr, { borderColor: theme.line }]}>
        <QrImage url={`${env.EXPO_PUBLIC_SITE_URL}/owner/scan`} size={QR} />
      </View>
      <View style={styles.copy}>
        <View style={styles.title}>
          <Smartphone size={22} color={theme.text} />
          <Text variant="title">{t('ownerScan.phoneTitle')}</Text>
        </View>
        <Text variant="body" style={{ color: theme.muted }}>
          {t('ownerScan.phoneBody')}
        </Text>
        <Pressable accessibilityRole="link" onPress={() => router.push('/owner/devices')}>
          <Text variant="body-strong" style={{ color: theme.ink }}>
            {t('ownerScan.pair')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space[6],
    padding: tokens.space[6],
  },
  qr: {
    padding: tokens.space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
  },
  copy: { flexGrow: 1, flexBasis: 280, gap: tokens.space[2] },
  title: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
});
