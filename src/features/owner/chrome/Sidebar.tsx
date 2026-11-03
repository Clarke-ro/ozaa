import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { LocationSwitcher } from './LocationSwitcher';
import { NavRow } from './NavRow';
import { PlanBadge } from './PlanBadge';
import { SidebarFooter } from './SidebarFooter';
import { isCurrent, navGroups } from './nav';

const OPEN_WIDTH = 248;
// Icon (20) + row padding on both sides, so the icons line up with the open sidebar's icons.
const RAIL_WIDTH = 72;

/** Wide screens only. Main, Sales and Settings; folds down to an icon rail. */
export function Sidebar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <View
      style={[
        styles.side,
        {
          width: collapsed ? RAIL_WIDTH : OPEN_WIDTH,
          borderRightColor: theme.line,
          backgroundColor: theme.surface,
          paddingTop: insets.top + tokens.space[4],
        },
      ]}
    >
      <View style={[styles.head, collapsed && styles.headRail]}>
        {collapsed ? null : (
          <View style={styles.brand}>
            <Text variant="display-m" accessibilityRole="header">
              Ozaa
            </Text>
            <PlanBadge />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? t('ownerChrome.expand') : t('ownerChrome.collapse')}
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => setCollapsed((value) => !value)}
          style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.7 }]}
        >
          <Toggle size={20} color={theme.muted} />
        </Pressable>
      </View>
      {collapsed ? null : <LocationSwitcher variant="block" />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tokens.space[4], gap: tokens.space[1] }}
      >
        {navGroups(role).map(({ group, items }) => (
          <View key={group} style={styles.group}>
            {collapsed ? (
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
            ) : (
              <Text
                variant="caption"
                accessibilityRole="header"
                style={[styles.groupLabel, { color: theme.muted }]}
              >
                {t(`owner.navGroups.${group}`)}
              </Text>
            )}
            {items.map((item) => (
              <NavRow
                key={item.id}
                id={item.id}
                href={item.href}
                current={isCurrent(path, item.href)}
                label={t(`owner.${item.id}`)}
                iconOnly={collapsed}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <SidebarFooter collapsed={collapsed} />
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    flexGrow: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: tokens.space[3],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: tokens.space[2],
    paddingBottom: tokens.space[3],
  },
  headRail: { justifyContent: 'center', paddingLeft: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  toggle: {
    minWidth: tokens.touchTarget,
    minHeight: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  group: { gap: 2, marginTop: tokens.space[3] },
  groupLabel: {
    fontFamily: 'Inter_600',
    paddingHorizontal: tokens.space[2],
    paddingBottom: tokens.space[1],
  },
  rule: { height: StyleSheet.hairlineWidth, marginBottom: tokens.space[2] },
});
