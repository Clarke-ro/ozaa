import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { PAYMENT_SERVICES } from '@/lib/features';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ServiceList } from './ServiceList';

const SECTIONS = ['table', 'rewards', 'fun', 'more'] as const;

/** Services the API knows about but the guest app has no screen for yet. Never shown as a dead end. */
export const NOT_BUILT: readonly string[] = ['reserve', 'events'];

/**
 * The four service sections from brand.md section 6. Every service, Menu included, is the same
 * full-width card; the API's order puts Menu first in "At your table".
 */
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
        const items = services.filter(
          (service) =>
            service.enabled &&
            service.section === section &&
            !NOT_BUILT.includes(service.id) &&
            !PAYMENT_SERVICES.includes(service.id),
        );
        if (items.length === 0) return null;
        return (
          <View key={section} style={styles.block}>
            <Text variant="title" accessibilityRole="header" style={styles.heading}>
              {t(`home.sections.${section}`)}
            </Text>
            <ServiceList items={items} onOpen={onOpen} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: tokens.space[8] },
  heading: { paddingHorizontal: tokens.grid.mobile.margin, marginBottom: tokens.space[3] },
});
