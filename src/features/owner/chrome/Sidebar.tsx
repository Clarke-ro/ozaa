import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { OzaaMark } from '../kit/OzaaMark';
import { LocationSwitcher } from './LocationSwitcher';
import { NavRow } from './NavRow';
import { PlanBadge } from './PlanBadge';
import { SidebarFooter } from './SidebarFooter';
import { isCurrent, navGroups } from './nav';
import { useNavCounts } from './useNavCounts';

// The mark is in the "micro" logo tier (32 px or less, brand.md section 1).
const MARK = tokens.space[8];

/**
 * Wide screens only. A light column on the card colour, split from the grey page by a thin
 * line, with the pages in groups (main, sales, settings). The open page sits in a pale orange
 * pill. It follows the person's light or dark setting like the page does. Folds to an icon rail.
 */
export function Sidebar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  const counts = useNavCounts();
  const [collapsed, setCollapsed] = useState(false);
  const Toggle = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <View
      style={[
        styles.side,
        {
          width: collapsed ? tokens.owner.rail : tokens.owner.sidebar,
          backgroundColor: theme.surface,
          borderRightColor: theme.line,
          paddingTop: insets.top + tokens.space[4],
        },
      ]}
    >
      <View style={[styles.head, collapsed && styles.headRail]}>
        {collapsed ? null : (
          <View style={styles.brand}>
            <OzaaMark size={MARK} />
            <Text variant="title" accessibilityRole="header" style={styles.word}>
              {t('ownerChrome.brand')}
            </Text>
            <PlanBadge />
          </View>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={collapsed ? t('ownerChrome.expand') : t('ownerChrome.collapse')}
          accessibilityState={{ expanded: !collapsed }}
          onPress={() => setCollapsed((value) => !value)}
          style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: theme.wash }]}
        >
          <Toggle size={20} color={theme.muted} />
        </Pressable>
      </View>
      {collapsed ? null : <LocationSwitcher variant="block" />}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {navGroups(role).map(({ group, items }, index) => (
          <View
            key={group}
            style={[styles.group, index > 0 && [styles.ruled, { borderTopColor: theme.line }]]}
          >
            {/* The main group needs no label; the groups after it are named. */}
            {collapsed || group === 'main' ? null : (
              <Text
                variant="caption"
                accessibilityRole="header"
                style={[styles.groupLabel, { color: theme.meta }]}
              >
                {t(`owner.navGroups.${group}`).toUpperCase()}
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
                count={counts[item.id]}
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
    gap: tokens.space[2],
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: tokens.space[1],
    paddingBottom: tokens.space[2],
  },
  headRail: { justifyContent: 'center', paddingLeft: 0 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  word: { fontFamily: fontFamily.strong },
  toggle: {
    minWidth: tokens.touchTarget,
    minHeight: tokens.touchTarget,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  list: { paddingTop: tokens.space[2], paddingBottom: tokens.space[4] },
  group: { gap: 2, paddingBottom: tokens.space[3] },
  ruled: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: tokens.space[4] },
  groupLabel: {
    fontFamily: fontFamily.strong,
    fontSize: tokens.owner.type.caps.size,
    lineHeight: tokens.owner.type.caps.line,
    letterSpacing: tokens.owner.type.caps.letterSpacing,
    paddingHorizontal: tokens.space[3],
    paddingBottom: tokens.space[2],
  },
});
