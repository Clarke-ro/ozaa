import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ListOrdered, Search, UtensilsCrossed, X } from 'lucide-react-native';
import type { MenuCategory, MenuItem } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ChipRow, ConfirmDialog, DeskTabs, EmptyCard } from '../../kit';
import { MenuItemRow } from './MenuItemRow';
import { DishEditor } from './DishEditor';
import { SectionEditor } from './SectionEditor';
import { SectionsSheet } from './SectionsSheet';
import { useMenuDesk } from './useMenuDesk';

type Kind = 'food' | 'drinks';
type Pending =
  | { kind: 'item'; item: MenuItem }
  | { kind: 'section'; section: MenuCategory }
  | { kind: 'soldOut'; items: MenuItem[] };

export function MenuScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  const [kind, setKind] = useState<Kind>('food');
  const [section, setSection] = useState('all');
  const [query, setQuery] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null | undefined>(undefined);
  const [editingSection, setEditingSection] = useState<MenuCategory | null | undefined>(undefined);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const all = desk.menu.data?.items ?? [];
  const sections = desk.sectionsOf(kind);
  const sectionName = (id: string) => sections.find((s) => s.id === id)?.name.en;
  const inKind = (item: MenuItem) =>
    (desk.menu.data?.categories ?? []).some((c) => c.id === item.categoryId && c.kind === kind);

  // Dishes in guest order: by section position, then as listed.
  const q = query.trim().toLowerCase();
  const order = new Map(sections.map((s, i) => [s.id, i]));
  const shown = all
    .filter((item) => inKind(item) && (section === 'all' || item.categoryId === section))
    .filter(
      (item) =>
        !q ||
        item.name.en.toLowerCase().includes(q) ||
        item.description?.en?.toLowerCase().includes(q),
    )
    .sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0));

  const counts = Object.fromEntries(
    sections.map((s) => [s.id, all.filter((i) => i.categoryId === s.id).length]),
  );
  const count = (k: Kind) =>
    all.filter((i) =>
      (desk.menu.data?.categories ?? []).some((c) => c.id === i.categoryId && c.kind === k),
    ).length;

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
        <DeskTabs
          value={kind}
          onChange={(k) => {
            setKind(k);
            setSection('all');
          }}
          tabs={[
            { id: 'food', label: t('ownerMenu.food'), count: count('food') },
            { id: 'drinks', label: t('ownerMenu.drinks'), count: count('drinks') },
          ]}
        />
        <View style={[styles.search, { borderColor: theme.line, backgroundColor: theme.surface }]}>
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
              style={styles.clear}
            >
              <X size={18} color={theme.muted} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.toolbar}>
          <View style={styles.flex}>
            <ChipRow
              value={section}
              onChange={setSection}
              items={[
                { id: 'all', label: t('ownerMenu.allSections') },
                ...sections.map((s) => ({
                  id: s.id,
                  label: s.hidden ? `${s.name.en} (${t('ownerMenu.hidden')})` : s.name.en,
                })),
              ]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ownerMenu.sections')}
            onPress={() => setSectionsOpen(true)}
            style={({ pressed }) => [
              styles.sectionsBtn,
              { borderColor: theme.line, backgroundColor: pressed ? theme.wash : theme.surface },
            ]}
          >
            <ListOrdered size={18} color={theme.ink} />
            <Text variant="body-strong">{t('ownerMenu.sections')}</Text>
          </Pressable>
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
                <MenuItemRow
                  key={item.id}
                  item={item}
                  currency={desk.currency}
                  section={section === 'all' ? sectionName(item.categoryId) : undefined}
                  onToggle={() => desk.toggle.mutate(item)}
                  onEdit={() => setEditingItem(item)}
                  onDelete={() => setPending({ kind: 'item', item })}
                />
              ))}
            </View>
          </>
        )}
      </DeskWait>

      <SectionsSheet
        visible={sectionsOpen}
        onClose={() => setSectionsOpen(false)}
        sections={sections}
        counts={counts}
        busy={desk.move.isPending}
        onMove={(id, direction) => desk.move.mutate({ id, direction, kind })}
        onEdit={(s) => setEditingSection(s)}
        onDelete={(s) => setPending({ kind: 'section', section: s })}
        onAdd={() => setEditingSection(null)}
      />
      {/* Keyed per item so the form starts fresh each time and a background refresh never wipes typing. */}
      {editingSection !== undefined ? (
        <SectionEditor
          key={editingSection?.id ?? 'new-section'}
          section={editingSection}
          kind={kind}
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
                  count: counts[pending.section.id] ?? 0,
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 48,
    paddingLeft: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  input: { flex: 1, minHeight: 46, fontFamily: 'Inter_400', fontSize: 16 },
  clear: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  sectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
    paddingHorizontal: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
  },
  bulk: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: tokens.space[1] },
  bulkBtn: { paddingHorizontal: tokens.space[2] },
  list: { gap: tokens.space[2] },
});
