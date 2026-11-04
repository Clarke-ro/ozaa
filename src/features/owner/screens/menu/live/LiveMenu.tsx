import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { MenuCategory, MenuItem, VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { MenuRail } from './MenuRail';
import { PhonePreview, type PreviewActions } from './PhonePreview';
import { ReorderSheet } from './ReorderSheet';

// Phone (390) + rail (320) + gaps fit side by side from here; below it the rail goes underneath.
const SIDE_BY_SIDE = 1100;

/** The menu as guests see it, editable in place, with the link, publish and style beside it. */
export function LiveMenu({
  venue,
  sections,
  dishes,
  onEditDish,
  onAddDish,
  onEditSection,
  onReorder,
}: Omit<PreviewActions, 'onReorder'> & {
  venue: VenueSettings;
  sections: MenuCategory[];
  dishes: MenuItem[];
  onReorder: (dishes: MenuItem[], orderedIds: string[]) => void;
}) {
  const { width } = useWindowDimensions();
  const [reordering, setReordering] = useState<{
    section: MenuCategory;
    dishes: MenuItem[];
  } | null>(null);
  const wide = width >= SIDE_BY_SIDE;
  return (
    <View style={[styles.wrap, wide && styles.row]}>
      <View style={wide ? styles.phoneCol : null}>
        <PhonePreview
          venue={venue}
          sections={sections}
          dishes={dishes}
          actions={{
            onEditDish,
            onAddDish,
            onEditSection,
            onReorder: (section, inSection) => setReordering({ section, dishes: inSection }),
          }}
        />
      </View>
      <View style={wide ? styles.railCol : null}>
        <MenuRail venue={venue} />
      </View>
      {reordering ? (
        <ReorderSheet
          section={reordering.section}
          dishes={reordering.dishes}
          onOrder={(orderedIds) => {
            onReorder(reordering.dishes, orderedIds);
            setReordering(null);
          }}
          onClose={() => setReordering(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[6] },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  phoneCol: { flex: 1 },
  railCol: { width: 320 },
});
