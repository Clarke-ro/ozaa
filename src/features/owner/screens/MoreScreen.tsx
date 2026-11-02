import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChartColumn,
  ChevronRight,
  ClipboardList,
  Gift,
  Grid2x2,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  MessageSquare,
  Palette,
  QrCode,
  Receipt,
  Settings2,
  Star,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { navFor, type OwnerNavId } from '../chrome/nav';
import { OwnerPage } from '../chrome/OwnerPage';
import type { StaffRole } from '@/features/orders';
import { IconTile } from '../kit';

const NAV_ICONS: Record<OwnerNavId, LucideIcon> = {
  dashboard: LayoutDashboard,
  floor: Grid2x2,
  orders: ClipboardList,
  calls: Bell,
  menu: UtensilsCrossed,
  loyalty: Gift,
  services: Settings2,
  payments: Wallet,
  reviews: Star,
  tables: QrCode,
  branding: Palette,
  staff: Users,
  insights: ChartColumn,
  setup: ListChecks,
  stock: Store,
  pos: Receipt,
  ai: MessageSquare,
  marketing: Megaphone,
};

const NAV_SUBTITLES: Partial<Record<OwnerNavId, string>> = {
  menu: 'Edit categories, dishes, prices and sold out items',
  loyalty: 'Reward stamps, points programme and member claims',
  services: 'Enable/disable guest table features and Wi-Fi',
  payments: 'MoMo & card transactions, daily settlement payouts',
  reviews: 'Moderate video reviews, ratings and private replies',
  tables: 'Generate QR codes and print acrylic table tents',
  branding: 'Theme colours, venue description, banner and logo',
  staff: 'Team accounts, roles, waiter & kitchen permissions',
  insights: 'Sales volume, peak hours and repeat guest trends',
  setup: '4-step onboarding wizard for fast floor deployment',
  stock: 'Inventory tracking, recipes and auto-86 ingredient rules',
  pos: 'Counter register ordering, cash tender and printed receipts',
  ai: 'Multilingual conversational ordering assistant',
  marketing: 'Broadcast SMS & WhatsApp promotions to opted-in guests',
};

export function MoreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const role = (useOwnerSession((state) => state.role) ?? 'waiter') as StaffRole;
  const items = navFor(role).filter((item) => !item.phone);

  return (
    <OwnerPage
      title={t('owner.more')}
      subtitle="All restaurant operations, configuration tools, marketing and manager controls."
    >
      <View style={styles.grid}>
        {items.map((item) => {
          const Icon = NAV_ICONS[item.id] ?? Settings2;
          const label = t(`owner.${item.id}`);
          const subtitle = NAV_SUBTITLES[item.id] ?? '';

          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={() => router.push(item.href as '/owner')}
              style={({ pressed }) => [
                styles.itemCard,
                {
                  borderColor: theme.line,
                  backgroundColor: pressed ? '#F9FAFB' : '#FFFFFF',
                },
              ]}
            >
              <View style={styles.itemMainRow}>
                <IconTile icon={Icon} tone="wash" size={36} />
                <View style={styles.itemMeta}>
                  <Text variant="body-strong">{label}</Text>
                  {subtitle ? (
                    <Text variant="caption" style={{ color: theme.meta }} numberOfLines={1}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </View>
            </Pressable>
          );
        })}
      </View>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: tokens.space[2],
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  itemMeta: {
    flex: 1,
    gap: 2,
  },
});
