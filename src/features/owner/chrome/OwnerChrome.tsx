import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Building2,
  ChartColumn,
  ClipboardList,
  Gift,
  Globe,
  Grid2x2,
  Inbox,
  LayoutDashboard,
  Link,
  ListChecks,
  Menu,
  Megaphone,
  MessageSquare,
  Palette,
  QrCode,
  Receipt,
  ScanLine,
  Settings,
  Settings2,
  Smartphone,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { canOpen, navFor, phoneNav, type OwnerNavId } from './nav';

const ICONS: Record<OwnerNavId, LucideIcon> = {
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
};

const WIDE = 840;

function isCurrent(pathname: string, href: string): boolean {
  if (href === '/owner') return pathname === '/owner';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OwnerChrome({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const role = useOwnerSession((state) => state.role) ?? 'waiter';
  const items = navFor(role);
  const path = usePathname();

  const sidebar = (
    <ScrollView style={[styles.side, { borderColor: theme.line, backgroundColor: theme.white, paddingTop: insets.top }]}>
      <Text variant="display-m" style={styles.word}>
        Ozaa
      </Text>
      {items.map((item) => (
        <NavRow key={item.id} id={item.id} href={item.href} current={isCurrent(path, item.href)} label={t(`owner.${item.id}`)} />
      ))}
    </ScrollView>
  );

  const phone = phoneNav(role);
  return (
    <View style={[styles.shell, { backgroundColor: theme.white, flexDirection: wide ? 'row' : 'column' }]}>
      {wide ? sidebar : null}
      <View style={{ flex: 1, paddingTop: wide ? 0 : insets.top }}>
        {canOpen(role, path) ? children : <Text style={{ padding: tokens.space[5] }}>{t('owner.blocked')}</Text>}
      </View>
      {wide ? null : (
        <View style={[styles.bar, { borderColor: theme.line, paddingBottom: Math.max(insets.bottom, 8), backgroundColor: theme.white }]}>
          {phone.map((item) => (
            <NavRow key={item.id} id={item.id} href={item.href} current={isCurrent(path, item.href)} label={t(`owner.${item.id}`)} compact />
          ))}
          <NavRow id="more" href="/owner/more" current={path === '/owner/more'} label={t('owner.more')} compact />
        </View>
      )}
    </View>
  );
}

function NavRow({
  id,
  href,
  label,
  current,
  compact,
}: {
  id: OwnerNavId | 'more';
  href: string;
  label: string;
  current: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();
  const Icon = id === 'more' ? Menu : ICONS[id];
  const color = current ? theme.fill : theme.meta;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: current }}
      onPress={() => router.push(href as '/owner')}
      style={[styles.row, compact && styles.compact]}
    >
      <Icon color={color} size={20} strokeWidth={2} />
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  side: { width: 220, borderRightWidth: 1, paddingHorizontal: tokens.space[3], flexGrow: 0 },
  word: { paddingHorizontal: tokens.space[2], paddingVertical: tokens.space[4] },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], paddingHorizontal: tokens.space[2] },
  compact: { flex: 1, flexDirection: 'column', justifyContent: 'center', gap: 2, paddingHorizontal: 0 },
  bar: { borderTopWidth: 1, flexDirection: 'row', paddingTop: 6 },
});
