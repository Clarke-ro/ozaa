import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ServiceIcon } from './ServiceIcon';

type Service = VenuePublic['services'][number];

/**
 * A stack of services, each its own white card with a soft shadow: a line icon, the name, and a
 * second line only when the API sends live news for it ("2 deals today").
 */
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
          backgroundColor: pressed ? theme.wash : theme.surface,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <ServiceIcon id={id} color={theme.ink} size={24} />
      <View style={styles.copy}>
        <Text variant="body-strong" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronRight color={theme.ink} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4], paddingHorizontal: tokens.grid.mobile.margin },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 64,
    paddingVertical: tokens.space[4],
    paddingHorizontal: tokens.space[5],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  copy: { flex: 1, gap: 2 },
});
