import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ServiceIcon } from './ServiceIcon';

type Service = VenuePublic['services'][number];

/** A stack of services, each its own full-width card with a gap between them. */
export function ServiceList({ items, onOpen }: { items: Service[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.stack}>
      {items.map((service) => (
        <ServiceCard
          key={service.id}
          id={service.id}
          subtitle={service.subtitle}
          onPress={() => onOpen(service.id)}
        />
      ))}
    </View>
  );
}

function ServiceCard({
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
  const title = t(`services.${id}.title`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          borderColor: theme.line,
          backgroundColor: pressed ? theme.wash : theme.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: theme.tint }]}>
        <ServiceIcon id={id} color={theme.ink} size={22} />
      </View>
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={1}>
          {title}
        </Text>
        {id === 'play' ? null : (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {subtitle ?? t(`services.${id}.body`)}
          </Text>
        )}
      </View>
      <ChevronRight color={theme.meta} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3], paddingHorizontal: tokens.grid.mobile.margin },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 76,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.xl - 4,
    borderCurve: 'continuous',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
