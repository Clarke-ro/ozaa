import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Plus, UtensilsCrossed } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { EmptyCard } from '../../kit';
import { filterDishes } from './deskFilter';
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
  timeZone,
  busy,
  onAddDish,
  onEditDish,
  onToggleDish,
  onNewSection,
  onSections,
  onAllOff,
  onAllOn,
  onPrices,
  onLibrary,
  onReorder,
}: {
  sections: MenuCategory[];
  dishes: MenuItem[];
  currency: string;
  timeZone: string;
  busy: boolean;
  onAddDish: (sectionId: string) => void;
  onEditDish: (item: MenuItem) => void;
  onToggleDish: (item: MenuItem) => void;
  onNewSection: () => void;
  onSections: () => void;
  /** With the dishes the list shows right now. */
  onAllOff: (shown: MenuItem[]) => void;
  onAllOn: (shown: MenuItem[]) => void;
  /** Change prices, for the dishes the list shows right now. */
  onPrices: (shown: MenuItem[]) => void;
  onLibrary: () => void;
  /** A dish dragged to a new place in its section. */
  onReorder: (dishes: MenuItem[], orderedIds: string[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const order = sections.map((s) => s.id);
  const shown = filterDishes(dishes, order, { status: 'all', section, query });
  const filtering = section !== 'all' || query.trim() !== '';
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
        section={section}
        onSection={setSection}
        chips={[
          { id: 'all', label: t('ownerMenu.filter.all'), count: dishes.length },
          ...sections.map((x) => ({ id: x.id, label: x.name.en, count: total(x.id) })),
        ]}
        busy={busy}
        onSections={onSections}
        onAllOff={() => onAllOff(shown)}
        onAllOn={() => onAllOn(shown)}
        onPrices={() => onPrices(shown)}
        onLibrary={onLibrary}
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
            setSection('all');
            setQuery('');
          }}
        />
      ) : (
        groups.map(({ sectionId, dishes: inSection }) => {
          const sec = sections.find((s) => s.id === sectionId);
          return (
            <SectionGroup
              key={sectionId}
              section={sec}
              name={sec?.name.en ?? t('ownerMenu.noSection')}
              total={total(sectionId)}
              dishes={inSection}
              currency={currency}
              timeZone={timeZone}
              draggable={query.trim() === ''}
              onAddDish={() => onAddDish(sectionId)}
              onEditDish={onEditDish}
              onToggleDish={onToggleDish}
              onReorder={onReorder}
            />
          );
        })
      )}
      {filtering ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={onNewSection}
          style={({ pressed }) => [
            styles.addSection,
            { borderColor: theme.line },
            pressed && { backgroundColor: theme.wash },
          ]}
        >
          <Plus size={18} color={theme.text} />
          <Text variant="button">{t('ownerMenu.addSection')}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 20 px between the toolbar, each section and the add button.
  stack: { gap: tokens.space[5] },
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 48,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.owner.controls.cardRadius,
  },
});
