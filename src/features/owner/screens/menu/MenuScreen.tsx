import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ListOrdered, Search, UtensilsCrossed, X } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { FilterChips } from '@/ui/FilterChips';
import { ConfirmDialog, EmptyCard, Segmented } from '../../kit';
import { DISH_FILTERS, filterCounts, filterDishes, type DishFilter } from './deskFilter';
import { MenuItemRow } from './MenuItemRow';
import { DishEditor } from './DishEditor';
import { SectionEditor } from './SectionEditor';
import { SectionsSheet } from './SectionsSheet';
import { useMenuDesk } from './useMenuDesk';
import { LiveMenu } from './live/LiveMenu';

// From this width the phone preview and its side panel fit together, so the menu opens live.
const LIVE_FIRST = 960;

type Pending =
  | { kind: 'item'; item: MenuItem }
  | { kind: 'section'; section: MenuCategory }
  | { kind: 'soldOut'; items: MenuItem[] };

export function MenuScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  const [status, setStatus] = useState<DishFilter>('all');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null | undefined>(undefined);
  const [editingSection, setEditingSection] = useState<MenuCategory | null | undefined>(undefined);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const { width } = useWindowDimensions();
    const [picked, setPicked] = useState<'list' | 'live' | null>(null);
  const mode = picked ?? (width >= LIVE_FIRST ? 'live' : 'list');

  const all = desk.menu.data?.items ?? [];
  // Food sections first, then drinks, each in the order guests see them.
  const sections = [...desk.sectionsOf('food'), ...desk.sectionsOf('drinks')];
  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name.en;
  const shown = filterDishes(
    all,
    sections.map((s) => s.id),
    { status, section, query },
  );
  const typeCounts = filterCounts(all);
  const sectionCount = (id: string) => all.filter((i) => i.categoryId === id).length;

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'item') desk.removeItem.mutate(pending.item.id);
    if (pending.kind === 'section') {
      desk.removeSection.mutate(pending.section.id);
      if (section === pending.section.id) setSection('all');
    }
    if (pending.kind === 'soldOut') desk.setAll.mutate({ items: pending.items, available: false });
    setPending(null);
  };

  return (
    <OwnerPage
      title={t('owner.menu')}
      action={
        <Button
          label={t('ownerMenu.addDish')}
          size="md"
          onPress={() => setEditingItem(null)}
          disabled={sections.length === 0}
        />
      }
    >
      <DeskWait
        loading={desk.menu.isLoading || desk.venue.isLoading}
        error={desk.menu.isError || desk.venue.isError}
        onRetry={() => void desk.menu.refetch()}
      >
        <Segmented
          label={t('ownerMenu.live.mode')}
          value={mode}
          onChange={setPicked}
          options={[
            { id: 'live', label: t('ownerMenu.live.preview') },
            { id: 'list', label: t('ownerMenu.live.list') },
          ]}
        />
        {mode === 'live' && desk.venue.data ? (
          <LiveMenu
            venue={desk.venue.data}
            sections={sections}
            dishes={all}
            onEditDish={setEditingItem}
            onAddDish={(id) => {
              setSection(id);
              setEditingItem(null);
            }}
            onEditSection={setEditingSection}
            onReorder={(dishes, orderedIds) => desk.reorderDishes.mutate({ dishes, orderedIds })}
          />
        ) : (
          <>
            <View style={styles.controls}>
              <View style={styles.searchRow}>
                <View
                  style={[
                    styles.search,
                    { backgroundColor: theme.surface, borderColor: theme.line },
                  ]}
                >
                  <Search size={18} color={theme.muted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder={t('ownerMenu.search')}
                    placeholderTextColor={theme.meta}
                    accessibilityLabel={t('ownerMenu.search')}
                    returnKeyType="search"
                    style={[styles.input, { color: theme.text }]}
                  />
                  {query ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('ownerFeedback.clear')}
                      onPress={() => setQuery('')}
                      hitSlop={tokens.space[2]}
                    >
                      <X size={18} color={theme.muted} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('ownerMenu.sections')}
                  onPress={() => setSectionsOpen(true)}
                  style={({ pressed }) => [
                    styles.iconBtn,
                    {
                      borderColor: theme.line,
                      backgroundColor: pressed ? theme.wash : theme.surface,
                    },
                  ]}
                >
                  <ListOrdered size={20} color={theme.ink} />
                </Pressable>
              </View>
              <View style={styles.filterBar}>
                <FilterChips<DishFilter>
                  label={t('ownerMenu.filterLabel')}
                  value={status}
                  onChange={setStatus}
                  items={DISH_FILTERS.map((id) => ({
                    id,
                    label: t(`ownerMenu.filter.${id}`),
                    count: typeCounts[id],
                  }))}
                />
                <FilterChips
                  label={t('ownerMenu.sections')}
                  value={section}
                  onChange={setSection}
                  items={[
                    { id: 'all', label: t('ownerMenu.allSections') },
                    ...sections.map((s) => ({
                      id: s.id,
                      label: s.hidden ? `${s.name.en} (${t('ownerMenu.hidden')})` : s.name.en,
                      count: sectionCount(s.id),
                    })),
                  ]}
                />
              </View>
            </View>

            {sections.length === 0 ? (
              <EmptyCard
                icon={UtensilsCrossed}
                title={t('ownerMenu.noSections')}
                description={t('ownerMenu.noSectionsBody')}
                actionLabel={t('ownerMenu.newSection')}
                onAction={() => setEditingSection(null)}
              />
            ) : shown.length === 0 ? (
              <EmptyCard
                icon={UtensilsCrossed}
                title={query ? t('ownerMenu.noMatch') : t('ownerMenu.noDishes')}
                description={query ? t('ownerFeedback.noMatchBody') : t('ownerMenu.noDishesBody')}
                actionLabel={query ? undefined : t('ownerMenu.addDish')}
                onAction={query ? undefined : () => setEditingItem(null)}
              />
            ) : (
              <>
                <View style={styles.bulk}>
                  <Text variant="caption" style={[styles.flex, { color: theme.muted }]}>
                    {t('ownerMenu.showing', { count: shown.length })}
                  </Text>
                  <Button
                    label={t('ownerMenu.allOffShort')}
                    tone="ghost"
                    size="md"
                    style={styles.bulkBtn}
                    disabled={desk.setAll.isPending}
                    onPress={() => setPending({ kind: 'soldOut', items: shown })}
                  />
                  <Button
                    label={t('ownerMenu.allOnShort')}
                    tone="ghost"
                    size="md"
                    style={styles.bulkBtn}
                    disabled={desk.setAll.isPending}
                    onPress={() => desk.setAll.mutate({ items: shown, available: true })}
                  />
                </View>
                <View style={styles.list}>
                  {shown.map((item) => (
                    <View key={item.id}>
                      <MenuItemRow
                        item={item}
                        currency={desk.currency}
                        section={section === 'all' ? sectionName(item.categoryId) : undefined}
                        onToggle={() => desk.toggle.mutate(item)}
                        onEdit={() => setEditingItem(item)}
                      />
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </DeskWait>

      <SectionsSheet
        visible={sectionsOpen}
        onClose={() => setSectionsOpen(false)}
        sections={sections}
        counts={Object.fromEntries(sections.map((x) => [x.id, sectionCount(x.id)]))}
        busy={desk.move.isPending}
        onMove={(id, direction) =>
          desk.move.mutate({
            id,
            direction,
            kind: sections.find((x) => x.id === id)?.kind ?? 'food',
          })
        }
        onEdit={(s) => setEditingSection(s)}
        onDelete={(s) => setPending({ kind: 'section', section: s })}
        onAdd={() => setEditingSection(null)}
      />
      {editingSection !== undefined ? (
        <SectionEditor
          key={editingSection?.id ?? 'new-section'}
          section={editingSection}
          kind={editingSection?.kind ?? 'food'}
          venueId={venueId}
          onClose={() => setEditingSection(undefined)}
          onSaved={() => {
            setEditingSection(undefined);
            void desk.refresh();
          }}
        />
      ) : null}
      {editingItem !== undefined ? (
        <DishEditor
          key={editingItem?.id ?? 'new-dish'}
          item={editingItem}
          sections={sections}
          defaultSectionId={section !== 'all' ? section : sections[0]?.id}
          venueId={venueId}
          currency={desk.currency}
          onClose={() => setEditingItem(undefined)}
          onDelete={
            editingItem
              ? () => {
                  setPending({ kind: 'item', item: editingItem });
                  setEditingItem(undefined);
                }
              : undefined
          }
          onSaved={() => {
            setEditingItem(undefined);
            void desk.refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        visible={pending !== null}
        destructive
        title={
          pending?.kind === 'soldOut'
            ? t('ownerMenu.confirmSoldOutTitle', { count: pending.items.length })
            : t('ownerMenu.confirmDeleteTitle')
        }
        message={
          pending?.kind === 'item'
            ? t('ownerMenu.confirmDeleteDish', { name: pending.item.name.en })
            : pending?.kind === 'section'
              ? t('ownerMenu.confirmDeleteSection', {
                  name: pending.section.name.en,
                  count: sectionCount(pending.section.id),
                })
              : t('ownerMenu.confirmSoldOutBody')
        }
        confirmLabel={pending?.kind === 'soldOut' ? t('ownerMenu.allOff') : t('ownerMenu.delete')}
        onConfirm={confirm}
        onCancel={() => setPending(null)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  controls: { gap: tokens.space[3] },
  searchRow: { flexDirection: 'row', gap: tokens.space[2] },
  filterBar: { gap: tokens.space[2] },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    boxShadow: tokens.shadow.card,
  },
  input: {
    flex: 1,
    minHeight: tokens.touchTarget,
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
  iconBtn: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: tokens.shadow.card,
  },
  bulk: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[1] },
  bulkBtn: { paddingHorizontal: tokens.space[2] },
  list: { gap: tokens.space[3] },
});
