import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Smartphone, Tablet, Trash2 } from 'lucide-react-native';
import type { ScannerDevice } from '@/lib/api/types';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

// Seen in the last few minutes counts as in use right now.
const ACTIVE_MS = 5 * 60_000;

/** One paired scanner: what it is, when it was paired and last used, and a clear Remove. */
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
  const { t, i18n } = useTranslation();
  const active = now - Date.parse(device.lastSeen) < ACTIVE_MS;
  // Tablets scan from the counter; phones from the floor. The name is the owner's own label.
  const tablet = /ipad|tab/i.test(`${device.name} ${device.platform ?? ''}`);
  const Icon = tablet ? Tablet : Smartphone;
  const paired = new Date(device.pairedAt).toLocaleDateString(i18n.language, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={styles.head}>
        <View style={[styles.icon, { backgroundColor: theme.tint }]}>
          <Icon size={22} color={theme.ink} />
        </View>
        <View style={styles.flex}>
          <Text variant="body-strong" numberOfLines={2}>
            {device.name}
          </Text>
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {[device.platform, t('ownerDevices.paired', { date: paired })]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>
      </View>
      <View style={[styles.foot, { borderColor: theme.line }]}>
        <View style={styles.seen}>
          <View style={[styles.dot, { backgroundColor: active ? theme.success : theme.meta }]} />
          <Text variant="caption" style={{ color: active ? theme.success : theme.muted }}>
            {active
              ? t('ownerDevices.activeNow')
              : t('ownerDevices.lastSeen', { when: timeAgo(device.lastSeen, now, t) })}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ownerDevices.removeTitle', { name: device.name })}
          onPress={onRemove}
          style={({ pressed }) => [
            styles.remove,
            { backgroundColor: pressed ? theme.errorTint : undefined },
          ]}
        >
          <Trash2 size={16} color={theme.error} />
          <Text variant="body-strong" style={{ color: theme.error }}>
            {t('ownerDevices.remove')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: tokens.space[3],
    paddingTop: tokens.space[4],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[1],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  icon: {
    width: 44,
    height: 44,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[1],
  },
  seen: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderRadius: tokens.radius.md,
  },
});
