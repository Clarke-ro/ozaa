import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { NotificationBell } from './NotificationBell';

/**
 * Phones only: the strip above a page's title.
 *
 * There is no Back arrow (Clarke, 2026-11-14): the page title is the header, and going back is
 * the system's own swipe from the left edge on iPhone or the back gesture on Android. So the bar
 * only shows when it holds something (Today's location switcher and bell); every other page gets
 * just the status-bar spacer and its title starts right under it.
 */
export function PhoneBar({ bell, start }: { bell: boolean; start?: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const top = insets.top + tokens.space[2];

  if (!start && !bell) {
    return <View style={{ height: top + tokens.space[1], backgroundColor: theme.bg }} />;
  }
  return (
    <View style={[styles.bar, { paddingTop: top, backgroundColor: theme.bg }]}>
      {start ? <View style={styles.start}>{start}</View> : null}
      <View style={styles.spacer} />
      {bell ? <NotificationBell /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
  },
  start: { flexShrink: 1, minWidth: 0, marginRight: tokens.space[3] },
  spacer: { flex: 1 },
});
