import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Smartphone, Tablet } from 'lucide-react-native';
import type { ScannerDevice } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';

/**
 * One paired phone or tablet as a row (design canvas): a plain icon, its name, its model and that
 * it can only scan, when it was last used, and a red-edged Remove.
 */
export function DeviceCard({
  device,
  now,
  onRemove,
}: {
  device: ScannerDevice;
  now: number;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tablet = /ipad|tab/i.test(`${device.name} ${device.platform ?? ''}`);
  const Icon = tablet ? Tablet : Smartphone;
  return (
    <View style={[cardStyle(theme), styles.row]}>
      <Icon size={24} color={theme.text} />
      <View style={styles.words}>
        <Text style={styles.name} numberOfLines={1}>
          {device.name}
        </Text>
        <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
          {[device.platform, t('ownerDevices.scanOnly')].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[styles.sub, { color: theme.meta }]}>
        {t('ownerDevices.used', { when: timeAgo(device.lastSeen, now, t) })}
      </Text>
      <Button
        label={t('ownerDevices.remove')}
        tone="secondary"
        labelColor={theme.error}
        onPress={onRemove}
        style={[styles.remove, { borderColor: theme.errorTint }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    // Canvas: roomy rows, 100 px tall, 24 px in from each side.
    minHeight: 100,
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[6],
  },
  words: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 18, lineHeight: 24, fontFamily: fontFamily.strong },
  sub: { fontSize: 16, lineHeight: 22 },
  remove: { minHeight: 52, paddingHorizontal: tokens.space[6] },
});
