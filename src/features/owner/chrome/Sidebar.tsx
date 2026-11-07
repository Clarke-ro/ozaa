import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import {
  fontFamily,
  ozaaOwnerDarkTheme,
  ThemeProvider,
  useTheme,
  type Theme,
} from '@/ui/theme';
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
 * Wide screens only. A black column next to the light page, like a till's side menu, so the
 * navigation reads as one block and the page stays clean. It always uses the dark owner theme;
 * the page keeps the person's own light or dark setting. Folds down to an icon rail.
 */
export function Sidebar() {
  const page = useTheme();
  return (
    <ThemeProvider theme={ozaaOwnerDarkTheme}>
      <SidebarBody pageScheme={page} />
    </ThemeProvider>
  );
}

function SidebarBody({ pageScheme }: { pageScheme: Theme }) {
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
          backgroundColor: theme.bg,
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
        {navGroups(role).map(({ group, items }) => (
          <View key={group} style={styles.group}>
            {collapsed ? (
              <View style={[styles.rule, { backgroundColor: theme.line }]} />
            ) : (
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

      <SidebarFooter collapsed={collapsed} dialogTheme={pageScheme} />
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
  list: { paddingBottom: tokens.space[4] },
  group: { gap: 2, marginTop: tokens.space[4] },
  groupLabel: {
    fontFamily: fontFamily.strong,
    fontSize: tokens.owner.micro.size,
    lineHeight: tokens.owner.micro.line,
    letterSpacing: 0.8,
    paddingHorizontal: tokens.space[3],
    paddingBottom: tokens.space[2],
  },
  rule: { height: StyleSheet.hairlineWidth, marginBottom: tokens.space[2] },
});
