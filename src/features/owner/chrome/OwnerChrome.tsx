import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Building2,
  ChartColumn,
  Check,
  ChevronDown,
  ClipboardList,
  Gift,
  Globe,
  Grid2x2,
  Inbox,
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
  Smartphone,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/lib/api';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { canOpen, navFor, phoneNav, type OwnerNavId } from './nav';
import { ModalSheet } from '../kit';

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
      <DesktopLocationSwitcher />
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
        {!wide ? <MobileTopBar /> : null}
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

function DesktopLocationSwitcher() {
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const [open, setOpen] = useState(false);

  const bizQuery = useQuery({
    queryKey: ['owner-business'],
    queryFn: () => api.ownerGetBusiness(),
  });

  const locations = bizQuery.data?.locations ?? [];
  const activeLoc = locations.find((l) => l.id === venueId);
  const activeName = activeLoc?.name ?? "Mama's Kitchen";

  return (
    <View style={styles.switcherBox}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Switch branch location"
        onPress={() => setOpen(true)}
        style={[styles.desktopSwitcher, { borderColor: theme.line, backgroundColor: theme.wash }]}
      >
        <Building2 size={16} color={theme.text} />
        <View style={{ flex: 1 }}>
          <Text variant="caption" style={{ color: theme.meta, fontSize: 10 }}>
            LOCATION
          </Text>
          <Text variant="body-strong" numberOfLines={1} style={{ fontSize: 13 }}>
            {activeName}
          </Text>
        </View>
        <ChevronDown size={14} color={theme.meta} />
      </Pressable>

      <ModalSheet visible={open} onClose={() => setOpen(false)} title="Select Location">
        <View style={{ gap: tokens.space[2] }}>
          {locations.map((loc) => {
            const isSelected = loc.id === venueId;
            return (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                onPress={() => {
                  switchVenue(loc.id);
                  setOpen(false);
                }}
                style={[
                  styles.locationOption,
                  {
                    borderColor: isSelected ? theme.ink : theme.line,
                    backgroundColor: isSelected ? theme.wash : theme.white,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body-strong">{loc.name}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {[loc.city, loc.country].filter(Boolean).join(', ') || 'Accra, Ghana'}
                  </Text>
                </View>
                {isSelected ? <Check size={18} color={theme.ink} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
              router.push('/owner/business' as '/owner');
            }}
            style={styles.manageLocationsBtn}
          >
            <Text variant="caption" style={{ color: '#D24000', textAlign: 'center', fontWeight: '700' }}>
              Manage all locations & business details →
            </Text>
          </Pressable>
        </View>
      </ModalSheet>
    </View>
  );
}

function MobileTopBar() {
  const theme = useTheme();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId);
  const switchVenue = useOwnerSession((state) => state.switchVenue);
  const [open, setOpen] = useState(false);

  const bizQuery = useQuery({
    queryKey: ['owner-business'],
    queryFn: () => api.ownerGetBusiness(),
  });

  const locations = bizQuery.data?.locations ?? [];
  const activeLoc = locations.find((l) => l.id === venueId);
  const activeName = activeLoc?.name ?? "Mama's Kitchen";

  return (
    <>
      <View style={[styles.mobileHeader, { borderBottomColor: theme.line, backgroundColor: theme.white }]}>
        <Text variant="title" style={{ fontFamily: 'Inter_700' }}>
          Ozaa
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Switch branch location"
          onPress={() => setOpen(true)}
          style={[styles.switcherChip, { borderColor: theme.line, backgroundColor: theme.wash }]}
        >
          <Building2 size={14} color={theme.text} />
          <Text variant="body-strong" numberOfLines={1} style={{ maxWidth: 160, fontSize: 13 }}>
            {activeName}
          </Text>
          <ChevronDown size={14} color={theme.meta} />
        </Pressable>
      </View>

      <ModalSheet visible={open} onClose={() => setOpen(false)} title="Select Location">
        <View style={{ gap: tokens.space[2] }}>
          {locations.map((loc) => {
            const isSelected = loc.id === venueId;
            return (
              <Pressable
                key={loc.id}
                accessibilityRole="button"
                onPress={() => {
                  switchVenue(loc.id);
                  setOpen(false);
                }}
                style={[
                  styles.locationOption,
                  {
                    borderColor: isSelected ? theme.ink : theme.line,
                    backgroundColor: isSelected ? theme.wash : theme.white,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="body-strong">{loc.name}</Text>
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {[loc.city, loc.country].filter(Boolean).join(', ') || 'Accra, Ghana'}
                  </Text>
                </View>
                {isSelected ? <Check size={18} color={theme.ink} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setOpen(false);
              router.push('/owner/business' as '/owner');
            }}
            style={styles.manageLocationsBtn}
          >
            <Text variant="caption" style={{ color: '#D24000', textAlign: 'center', fontWeight: '700' }}>
              Manage all locations & business details →
            </Text>
          </Pressable>
        </View>
      </ModalSheet>
    </>
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
  word: { paddingHorizontal: tokens.space[2], paddingTop: tokens.space[4], paddingBottom: tokens.space[2] },
  switcherBox: {
    paddingHorizontal: tokens.space[1],
    paddingBottom: tokens.space[3],
  },
  desktopSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    padding: tokens.space[2],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
    borderBottomWidth: 1,
  },
  switcherChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.space[3],
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
  },
  manageLocationsBtn: {
    paddingVertical: tokens.space[3],
    alignItems: 'center',
  },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: tokens.space[2], paddingHorizontal: tokens.space[2] },
  compact: { flex: 1, flexDirection: 'column', justifyContent: 'center', gap: 2, paddingHorizontal: 0 },
  bar: { borderTopWidth: 1, flexDirection: 'row', paddingTop: 6 },
});
