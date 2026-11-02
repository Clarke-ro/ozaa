import { Pressable, StyleSheet, View } from 'react-native';
import {
  Bell,
  BookOpen,
  Calendar,
  ChevronRight,
  Clock,
  CreditCard,
  Flag,
  Gamepad2,
  Gift,
  Info,
  Star,
  Tag,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

const ICONS: Record<string, LucideIcon> = {
  menu: BookOpen,
  waiter: Bell,
  status: Clock,
  pay: CreditCard,
  wifi: Wifi,
  loyalty: Gift,
  offers: Tag,
  review: Star,
  play: Gamepad2,
  reserve: Calendar,
  events: Calendar,
  feedback: Flag,
  about: Info,
};

const SECTIONS = ['table', 'rewards', 'fun', 'more'] as const;

export function ServiceGrid({
  services,
  onOpen,
}: {
  slug: string;
  services: VenuePublic['services'];
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View>
      {SECTIONS.map((section) => {
        const items = services.filter((service) => service.enabled && service.section === section);
        if (items.length === 0) return null;
        return (
          <View key={section} style={styles.block}>
            <Text variant="display-m" style={styles.heading}>
              {t(`home.sections.${section}`)}
            </Text>
            {items.map((service) => (
              <ServiceRow
                key={service.id}
                id={service.id}
                subtitle={service.subtitle}
                onPress={() => onOpen(service.id)}
              />
            ))}
          </View>
        );
      })}
    </View>
  );
}

function ServiceRow({
  id,
  subtitle,
  onPress,
}: {
  id: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`services.${id}.title`)}
      onPress={onPress}
      style={[styles.row, { borderColor: theme.line }]}
    >
      <View style={[styles.icon, { backgroundColor: theme.wash }]}>
        <Icon id={id} color={theme.ink} />
      </View>
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={1}>
          {t(`services.${id}.title`)}
        </Text>
        {id === 'play' ? null : (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {subtitle ?? t(`services.${id}.body`)}
          </Text>
        )}
      </View>
      <ChevronRight color={theme.meta} size={18} />
    </Pressable>
  );
}

function Icon({ id, color }: { id: string; color: string }) {
  const Glyph = ICONS[id] ?? Info;
  return <Glyph color={color} size={22} strokeWidth={2} />;
}

const styles = StyleSheet.create({
  block: { marginTop: 28 },
  heading: { paddingHorizontal: tokens.grid.mobile.margin, marginBottom: 12 },
  row: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: { flex: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
