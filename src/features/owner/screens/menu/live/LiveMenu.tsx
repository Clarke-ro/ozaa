import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import type { MenuCategory, MenuItem, VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { MenuRail } from './MenuRail';
import { PhonePreview, type PreviewActions } from './PhonePreview';
import { ReorderSheet } from './ReorderSheet';
import { WalkInPreview } from './WalkInPreview';
import { WalkInRail } from './WalkInRail';

/** Who the preview is for: guests ordering from the menu link, or guests at a table. */
export type Audience = 'online' | 'walkin';

// Phone (390) + rail (360) + gaps fit side by side from here; below it the rail goes underneath.
const SIDE_BY_SIDE = 920;

/**
 * The menu as guests see it, editable in place. Online shows the menu-link page with the link,
 * publish switch and style beside it; walk-in shows the table page a guest lands on after
 * scanning, with where to change its buttons beside it.
 */
export function LiveMenu({
  audience,
  venue,
  sections,
  dishes,
  onEditDish,
  onAddDish,
  onEditSection,
  onReorder,
  stacked,
}: Omit<PreviewActions, 'onReorder'> & {
  /** In the Menu's side column: the settings go under the phone, never beside it. */
  stacked?: boolean;
  audience: Audience;
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
  const wide = !stacked && width >= SIDE_BY_SIDE;
  const actions: PreviewActions = {
    onEditDish,
    onAddDish,
    onEditSection,
    onReorder: (section, inSection) => setReordering({ section, dishes: inSection }),
  };
  return (
    <View style={[styles.wrap, wide && styles.row]}>
      <View style={wide ? styles.phoneCol : null}>
        {audience === 'online' ? (
          <PhonePreview venue={venue} sections={sections} dishes={dishes} actions={actions} />
        ) : (
          <WalkInPreview venue={venue} sections={sections} dishes={dishes} actions={actions} />
        )}
      </View>
      <View style={wide ? styles.railCol : null}>
        {audience === 'online' ? <MenuRail venue={venue} /> : <WalkInRail venue={venue} />}
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
  railCol: { width: 360 },
});
