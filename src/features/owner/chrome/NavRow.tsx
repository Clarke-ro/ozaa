import { useCallback } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import {
  Bell,
  BellDot,
  Building2,
  ChartColumn,
  ClipboardList,
  Gift,
  Globe,
  Grid2x2,
  CreditCard,
  Inbox,
  Layers,
  Plug,
  TicketPercent,
  UserRoundSearch,
  LayoutDashboard,
  Link,
  ListChecks,
  Megaphone,
  Menu,
  MessageSquare,
  Palette,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Settings2,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { OwnerNavId } from './nav';

export const NAV_ICONS: Record<OwnerNavId | 'more', LucideIcon> = {
  dashboard: LayoutDashboard,
  floor: Grid2x2,
  orders: ClipboardList,
  calls: Bell,
  menu: UtensilsCrossed,
  loyalty: Gift,
  feedback: Inbox,
  services: Settings2,
  payments: Wallet,
  reviews: Star,
  socials: Globe,
  links: Link,
  tables: QrCode,
  branding: Palette,
  staff: Users,
  insights: ChartColumn,
  setup: ListChecks,
  stock: Store,
  pos: Receipt,
  ai: MessageSquare,
  marketing: Megaphone,
  scan: ScanLine,
  devices: Smartphone,
  business: Building2,
  settings: Settings,
  notifications: BellDot,
  categories: Layers,
  notice: Megaphone,
  customers: UserRoundSearch,
  promos: TicketPercent,
  integrations: Plug,
  billing: CreditCard,
  ordering: ShoppingBag,
  more: Menu,
};

/**
 * Opens a top-level section (a tab or a sidebar item). It clears the screens stacked on top
 * first, so a tab always lands on its own root and Back never walks through old tabs.
 */
export function useGoTo() {
  const router = useRouter();
  const path = usePathname();
  return useCallback(
    (href: string) => {
      if (href === path) return;
      if (router.canDismiss()) router.dismissAll();
      router.replace(href as Href);
    },
    [router, path],
  );
}

export function NavRow({
  id,
  href,
  label,
  current,
  compact,
  iconOnly,
}: {
  id: OwnerNavId | 'more';
  href: string;
  label: string;
  current: boolean;
  compact?: boolean;
  /** The collapsed sidebar: icon only, the label stays for screen readers. */
  iconOnly?: boolean;
}) {
  const theme = useTheme();
  const goTo = useGoTo();
  const Icon = NAV_ICONS[id];
  // The selected tab changes colour AND weight, so state never rests on colour alone.
  const color = current ? theme.ink : theme.muted;
  return (
    <Pressable
      accessibilityRole={compact ? 'tab' : 'button'}
      accessibilityLabel={label}
      accessibilityState={{ selected: current }}
      // aria-selected is what React Native Web passes to the browser; accessibilityState alone is not.
      aria-selected={current}
      onPress={() => {
        if (compact) void hapticSelection();
        goTo(href);
      }}
      style={({ pressed }) => [
        compact ? styles.tab : styles.row,
        iconOnly && styles.iconOnly,
        !compact && current && { backgroundColor: theme.tint },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Icon color={color} size={compact ? 24 : 20} strokeWidth={current ? 2.4 : 2} />
      {iconOnly ? null : (
        <Text
          variant="caption"
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
          style={[
            compact ? styles.tabLabel : styles.rowLabel,
            {
              color: current ? theme.ink : compact ? theme.muted : theme.text,
              fontFamily: current ? 'Inter_600' : 'Inter_400',
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: tokens.touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.sm,
    borderCurve: 'continuous',
  },
  iconOnly: { justifyContent: 'center', paddingHorizontal: 0 },
  rowLabel: { fontSize: tokens.type.body.size, lineHeight: tokens.type.body.line },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabLabel: { fontSize: 11, lineHeight: 13 },
});
