import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { CravinsMark } from '../kit/CravinsMark';
import { LocationSwitcher } from './LocationSwitcher';
import { NavRow } from './NavRow';
import { PlanBadge } from './PlanBadge';
import { SidebarFooter } from './SidebarFooter';
import { isCurrent, navGroups } from './nav';
import { useNavCounts } from './useNavCounts';
import { useOwnerPrefs } from '../data/ownerPrefs';

// The mark is in the "micro" logo tier (32 px or less, brand.md section 1).
const MARK = tokens.space[8];

/**
 * Wide screens only. A light column on the card colour, split from the light orange page by a thin
 * line, with the pages in groups (main, sales, guests, venue, account). The open page sits in a
 * pale orange pill. Folds to an icon rail (counts become dots), and remembers that choice. The
 * owner button at the foot opens profile and settings, where Help and sign out live.
 */
export function Sidebar() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const path = usePathname();
  const counts = useNavCounts();
  const collapsed = useOwnerPrefs((state) => state.sidebarCollapsed);
  const setCollapsed = useOwnerPrefs((state) => state.setSidebarCollapsed);
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
            <CravinsMark size={MARK} />
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
          onPress={() => setCollapsed(!collapsed)}
          style={({ pressed }) => [styles.toggle, pressed && { backgroundColor: theme.wash }]}
        >
          <Toggle size={20} color={theme.muted} />
        </Pressable>
      </View>
      <LocationSwitcher variant={collapsed ? 'rail' : 'block'} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list}>
        {navGroups(role).map(({ group, items }, index) => (
          <View
            key={group}
            style={[styles.group, index > 0 && [styles.ruled, { borderTopColor: theme.line }]]}
          >
            {/* The main group needs no label; the groups after it are named. Folded, the line between groups is enough. */}
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
