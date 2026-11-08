import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { EmptyCard, ToastHost } from '../kit';
import { useArrivalChime } from '../data/useArrivalChime';
import { useOwnerLayout } from './layout';
import { NavRow, useGoTo } from './NavRow';
import { Sidebar } from './Sidebar';
import { canOpen, isCurrent, tabsFor } from './nav';
import { useNavCounts } from './useNavCounts';

/** Wide screens get the sidebar; phones and small tablets get a tab bar so the page keeps its width. */
export function OwnerChrome({ children }: { children: ReactNode }) {
  const { wide } = useOwnerLayout();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  useArrivalChime();
  const tabBarSpace = wide
    ? tokens.space[6]
    : tokens.owner.tabBar + Math.max(insets.bottom, tokens.space[2]) + tokens.space[3];

  return (
    <View
      style={[styles.shell, { backgroundColor: theme.bg, flexDirection: wide ? 'row' : 'column' }]}
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      {wide ? <Sidebar /> : null}
      <View style={styles.main}>{canOpen(role, path) ? children : <Blocked />}</View>
      {wide ? null : <TabBar />}
      <ToastHost bottom={tabBarSpace} />
    </View>
  );
}

function TabBar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  const counts = useNavCounts();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          borderTopColor: theme.line,
          backgroundColor: theme.surface,
          paddingBottom: Math.max(insets.bottom, tokens.space[2]),
        },
      ]}
    >
      {tabsFor(role).map((item) => (
        <NavRow
          key={item.id}
          id={item.id}
          href={item.href}
          current={isCurrent(path, item.href)}
          label={t(`owner.${item.id}`)}
          count={counts[item.id]}
          compact
        />
      ))}
      <NavRow
        id="more"
        href="/owner/more"
        current={path === '/owner/more'}
        label={t('owner.more')}
        compact
      />
    </View>
  );
}

function Blocked() {
  const { t } = useTranslation();
  const goTo = useGoTo();
  return (
    <View style={styles.blocked}>
      <EmptyCard
        icon={Lock}
        title={t('ownerKit.blockedTitle')}
        description={t('ownerKit.blockedBody')}
        actionLabel={t('ownerKit.goToday')}
        onAction={() => goTo('/owner')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  main: { flex: 1 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[1],
  },
  blocked: { flex: 1, justifyContent: 'center', padding: tokens.space[4] },
});
