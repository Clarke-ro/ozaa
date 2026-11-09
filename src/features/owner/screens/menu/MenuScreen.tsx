import { useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ConfirmDialog, Segmented } from '../../kit';
import { DishEditor } from './DishEditor';
import { LiveMenu } from './live/LiveMenu';
import { MenuListView } from './MenuListView';
import { SectionEditor } from './SectionEditor';
import { SectionsSheet } from './SectionsSheet';
import { useMenuDesk } from './useMenuDesk';

// From this width the phone preview and its side panel fit together, so the menu opens live.
const LIVE_FIRST = 960;

type Pending =
  | { kind: 'item'; item: MenuItem }
  | { kind: 'section'; section: MenuCategory }
  | { kind: 'soldOut'; items: MenuItem[] };

/**
 * The menu builder: the live phone preview or the list, the dish and section editors, and the
 * confirmations for deleting and for marking everything sold out.
 */
export function MenuScreen() {
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  const { width } = useWindowDimensions();
  const [picked, setPicked] = useState<'list' | 'live' | null>(null);
  const mode = picked ?? (width >= LIVE_FIRST ? 'live' : 'list');
  // The section a new dish goes into, from "Add a dish here".
  const [addTo, setAddTo] = useState<string | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<MenuItem | null | undefined>(undefined);
  const [editingSection, setEditingSection] = useState<MenuCategory | null | undefined>(undefined);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const all = desk.menu.data?.items ?? [];
  // Food sections first, then drinks, each in the order guests see them.
  const sections = [...desk.sectionsOf('food'), ...desk.sectionsOf('drinks')];
  const sectionCount = (id: string) => all.filter((i) => i.categoryId === id).length;
  const addDish = (sectionId?: string) => {
    setAddTo(sectionId);
    setEditingItem(null);
  };

  const confirm = () => {
    if (!pending) return;
    if (pending.kind === 'item') desk.removeItem.mutate(pending.item.id);
    if (pending.kind === 'section') desk.removeSection.mutate(pending.section.id);
    if (pending.kind === 'soldOut') desk.setAll.mutate({ items: pending.items, available: false });
    setPending(null);
  };

  return (
    <OwnerPage
      title={t('owner.menu')}
      subtitle={t('ownerMenu.lead')}
      action={
        <Button
          label={t('ownerMenu.addDish')}
          size="md"
          onPress={() => addDish()}
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
            onAddDish={addDish}
            onEditSection={setEditingSection}
            onReorder={(dishes, orderedIds) => desk.reorderDishes.mutate({ dishes, orderedIds })}
          />
        ) : (
          <MenuListView
            sections={sections}
            dishes={all}
            currency={desk.currency}
            busy={desk.setAll.isPending}
            onAddDish={addDish}
            onEditDish={setEditingItem}
            onToggleDish={(item) => desk.toggle.mutate(item)}
            onEditSection={setEditingSection}
            onNewSection={() => setEditingSection(null)}
            onSections={() => setSectionsOpen(true)}
            onAllOff={(items) => setPending({ kind: 'soldOut', items })}
            onAllOn={(items) => desk.setAll.mutate({ items, available: true })}
          />
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
          defaultSectionId={addTo ?? sections[0]?.id}
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
