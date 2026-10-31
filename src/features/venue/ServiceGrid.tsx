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
  const theme = useTheme();
  return (
    <View>
      {SECTIONS.map((section) => {
        const items = services.filter((service) => service.enabled && service.section === section);
        if (items.length === 0) return null;
        const wideFirst = section === 'table' && items.length % 2 === 1;
        return (
          <View key={section} style={styles.block}>
            <Text variant="display-m" style={styles.heading}>
              {t(`home.sections.${section}`)}
            </Text>
            {section === 'table' ? (
              <View style={styles.grid}>
                {items.map((service, index) => (
                  <ServiceCard
                    key={service.id}
                    id={service.id}
                    wide={wideFirst && index === 0}
                    subtitle={service.subtitle}
                    onPress={() => onOpen(service.id)}
                    ink={theme.ink}
                    line={theme.line}
                    wash={theme.wash}
                  />
                ))}
              </View>
            ) : (
              items.map((service) => (
                <Pressable
                  key={service.id}
                  accessibilityRole="button"
                  accessibilityLabel={t(`services.${service.id}.title`)}
                  onPress={() => onOpen(service.id)}
                  style={[styles.row, { borderColor: theme.line }]}
                >
                  <View style={[styles.icon, { backgroundColor: theme.wash }]}>
                    <Icon id={service.id} color={theme.ink} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="body-strong">{t(`services.${service.id}.title`)}</Text>
                    <Text variant="caption" style={{ color: theme.muted }}>
                      {service.subtitle ?? t(`services.${service.id}.body`)}
                    </Text>
                  </View>
                  {service.id === 'play' ? (
                    <Text variant="caption" style={[styles.stamp, { color: theme.ink }]}>
                      {t('game.stamp', { score: 15 })}
                    </Text>
                  ) : null}
                  <ChevronRight color={theme.meta} size={18} />
                </Pressable>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

function ServiceCard({
  id,
  wide,
  subtitle,
  onPress,
  ink,
  line,
  wash,
}: {
  id: string;
  wide: boolean;
  subtitle?: string;
  onPress: () => void;
  ink: string;
  line: string;
  wash: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`services.${id}.title`)}
      onPress={onPress}
      style={[styles.card, wide && styles.wide, { borderColor: line }]}
    >
      <View style={[styles.icon, { backgroundColor: wash }]}>
        <Icon id={id} color={ink} />
      </View>
      <View style={{ flex: wide ? 1 : undefined }}>
        <Text variant="body-strong">{t(`services.${id}.title`)}</Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {subtitle ?? t(`services.${id}.body`)}
        </Text>
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
  grid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '48%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    minHeight: 112,
    backgroundColor: '#fff',
  },
  wide: { width: '100%', minHeight: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  stamp: { fontFamily: 'Inter_600' },
});
