import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { EmptyCard, ToastHost } from '../kit';
import { LocationSwitcher } from './LocationSwitcher';
import { NavRow, useGoTo } from './NavRow';
import { canOpen, isCurrent, moreGroups, tabsFor } from './nav';

// Below this width the sidebar would squeeze the page, so phones and small tablets get a tab bar.
const WIDE = 840;
const TAB_BAR_HEIGHT = 56;

export function OwnerChrome({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  const tabBarSpace = wide
    ? tokens.space[6]
    : TAB_BAR_HEIGHT + Math.max(insets.bottom, tokens.space[2]) + tokens.space[3];

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
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          borderTopColor: theme.line,
          backgroundColor: theme.bg,
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

function Sidebar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  // Tabs first, then the More groups, so the order matches the phone layout.
  const groups = [{ group: null, items: tabsFor(role) }, ...moreGroups(role)];
  return (
    <ScrollView
      style={[styles.side, { borderRightColor: theme.line, backgroundColor: theme.bg }]}
      contentContainerStyle={{
        paddingTop: insets.top + tokens.space[4],
        paddingBottom: tokens.space[8],
        gap: tokens.space[1],
      }}
    >
      <Text variant="display-m" accessibilityRole="header" style={styles.sideWord}>
        Ozaa
      </Text>
      <LocationSwitcher variant="block" />
      {groups.map(({ group, items }) => (
        <View key={group ?? 'tabs'} style={styles.sideGroup}>
          {group ? (
            <Text
              variant="caption"
              accessibilityRole="header"
              style={[styles.sideLabel, { color: theme.muted }]}
            >
              {t(`owner.navGroups.${group}`)}
            </Text>
          ) : null}
          {items.map((item) => (
            <NavRow
              key={item.id}
              id={item.id}
              href={item.href}
              current={isCurrent(path, item.href)}
              label={t(`owner.${item.id}`)}
            />
          ))}
        </View>
      ))}
    </ScrollView>
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
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  word: { fontSize: 20, lineHeight: 26 },
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: tokens.space[1],
  },
  side: {
    width: 248,
    flexGrow: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.space[3],
  },
  sideWord: { paddingHorizontal: tokens.space[2], paddingBottom: tokens.space[3] },
  sideGroup: { gap: 2, marginTop: tokens.space[3] },
  sideLabel: {
    fontFamily: 'Inter_600',
    paddingHorizontal: tokens.space[2],
    paddingBottom: tokens.space[1],
  },
  blocked: { flex: 1, justifyContent: 'center', padding: tokens.space[4] },
});
