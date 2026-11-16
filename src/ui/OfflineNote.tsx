import { useEffect, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { onlineManager } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from './Text';
import { useTheme } from './theme';

const subscribe = (notify: () => void) => onlineManager.subscribe(notify);

// When the connection last changed, so the age is right the moment the note appears.
let changedAt = Date.now();
onlineManager.subscribe(() => {
  changedAt = Date.now();
});
const isOnline = () => onlineManager.isOnline();

/** True while the device has no connection. Safe to call from any screen. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, isOnline, isOnline);
}

/**
 * A quiet line when the phone is offline, saying how old the saved data is
 * ("You're offline. Showing what we saved 2 minutes ago."). On a screen that sends something
 * (basket, call waiter), `sending` says that instead. Hidden when online.
 */
export function OfflineNote({ savedAt, sending }: { savedAt?: number; sending?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const online = useOnline();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (online) return;
    // Keep "saved N minutes ago" honest while the phone stays offline.
    const id = setInterval(() => setTick(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [online]);
  if (online) return null;
  const now = Math.max(tick, changedAt);
  const minutes = savedAt ? Math.floor((now - savedAt) / 60_000) : null;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.note, { backgroundColor: theme.wash, borderColor: theme.line }]}
    >
      <WifiOff size={16} color={theme.muted} />
      <Text variant="caption" style={[styles.text, { color: theme.text }]}>
        {sending
          ? t('errors.offlineSend')
          : minutes != null && minutes >= 1
            ? t('errors.offlineAgo', { count: minutes })
            : t('errors.offline')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    marginHorizontal: tokens.grid.mobile.margin,
    paddingHorizontal: tokens.space[3],
    paddingVertical: tokens.space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.md,
  },
  text: { flex: 1 },
});
