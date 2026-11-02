import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { VenuePublic } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { ServiceList } from './ServiceList';
import { MenuRow } from './MenuRow';

const SECTIONS = ['table', 'rewards', 'fun', 'more'] as const;

/** Services the API knows about but the guest app has no screen for yet. Never shown as a dead end. */
export const NOT_BUILT: readonly string[] = ['reserve', 'events'];

/**
 * The four service sections from brand.md section 6. Every service is a full-width row in a
 * grouped list. Menu is what a seated guest taps most, so it gets its own larger row on top.
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
            service.enabled && service.section === section && !NOT_BUILT.includes(service.id),
        );
        if (items.length === 0) return null;
        return (
          <View key={section} style={styles.block}>
            <Text variant="title" accessibilityRole="header" style={styles.heading}>
              {t(`home.sections.${section}`)}
            </Text>
            {items.some((s) => s.id === 'menu') ? (
              <View style={styles.feature}>
                <MenuRow
                  id="menu"
                  subtitle={items.find((s) => s.id === 'menu')?.subtitle}
                  onPress={() => onOpen('menu')}
                />
              </View>
            ) : null}
            {items.some((s) => s.id !== 'menu') ? (
              <ServiceList items={items.filter((s) => s.id !== 'menu')} onOpen={onOpen} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: tokens.space[8] },
  heading: { paddingHorizontal: tokens.grid.mobile.margin, marginBottom: tokens.space[3] },
  feature: { paddingHorizontal: tokens.grid.mobile.margin, marginBottom: tokens.space[3] },
});
