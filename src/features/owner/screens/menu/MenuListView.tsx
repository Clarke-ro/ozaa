import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { UtensilsCrossed } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { EmptyCard } from '../../kit';
import { filterCounts, filterDishes, type DishFilter } from './deskFilter';
import { groupDishes } from './groupDishes';
import { MenuToolbar } from './MenuToolbar';
import { SectionGroup } from './SectionGroup';

/**
 * The menu as a list: one toolbar row (search, which dishes, more actions), then one card per
 * section in guest order with its dishes inside. With no search or filter on, empty sections
 * stay so you can add to them; with one on, only sections with a match show.
 */
export function MenuListView({
  sections,
  dishes,
  currency,
  busy,
  onAddDish,
  onEditDish,
  onToggleDish,
  onEditSection,
  onNewSection,
  onSections,
  onAllOff,
  onAllOn,
}: {
  sections: MenuCategory[];
  dishes: MenuItem[];
  currency: string;
  busy: boolean;
  onAddDish: (sectionId: string) => void;
  onEditDish: (item: MenuItem) => void;
  onToggleDish: (item: MenuItem) => void;
  onEditSection: (section: MenuCategory) => void;
  onNewSection: () => void;
  onSections: () => void;
  /** With the dishes the list shows right now. */
  onAllOff: (shown: MenuItem[]) => void;
  onAllOn: (shown: MenuItem[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [status, setStatus] = useState<DishFilter>('all');
  const [query, setQuery] = useState('');
  const order = sections.map((s) => s.id);
  const shown = filterDishes(dishes, order, { status, section: 'all', query });
  const filtering = status !== 'all' || query.trim() !== '';
  const groups = groupDishes(shown, order, { keepEmpty: !filtering });
  const total = (id: string) => dishes.filter((d) => d.categoryId === id).length;

  if (sections.length === 0) {
    return (
      <EmptyCard
        icon={UtensilsCrossed}
        title={t('ownerMenu.noSections')}
        description={t('ownerMenu.noSectionsBody')}
        actionLabel={t('ownerMenu.newSection')}
        onAction={onNewSection}
      />
    );
  }

  return (
    <View style={styles.stack}>
      <MenuToolbar
        query={query}
        onQuery={setQuery}
        status={status}
        onStatus={setStatus}
        counts={filterCounts(dishes)}
        busy={busy}
        onSections={onSections}
        onAllOff={() => onAllOff(shown)}
        onAllOn={() => onAllOn(shown)}
      />
      {filtering ? (
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerMenu.showing', { count: shown.length })}
        </Text>
      ) : null}
      {groups.length === 0 ? (
        <EmptyCard
          icon={UtensilsCrossed}
          title={t('ownerMenu.noMatch')}
          description={t('ownerMenu.noMatchBody')}
          actionLabel={t('ownerMenu.showAll')}
          onAction={() => {
            setStatus('all');
            setQuery('');
          }}
        />
      ) : (
        groups.map(({ sectionId, dishes: inSection }) => {
          const section = sections.find((s) => s.id === sectionId);
          return (
            <SectionGroup
              key={sectionId}
              section={section}
              name={section?.name.en ?? t('ownerMenu.noSection')}
              total={total(sectionId)}
              dishes={inSection}
              currency={currency}
              onAddDish={() => onAddDish(sectionId)}
              onEditSection={() => section && onEditSection(section)}
              onEditDish={onEditDish}
              onToggleDish={onToggleDish}
            />
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
});
