import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerLayout } from '../../chrome/layout';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { AddDashed, ConfirmDialog, SectionLabel } from '../../kit';
import { DragList } from '../../kit/DragList';
import { CategoryRow } from './CategoryRow';
import { LiveMenuCard } from './LiveMenuCard';
import { SectionEditor } from './SectionEditor';
import { useMenuDesk } from './useMenuDesk';

const KINDS = ['food', 'drinks'] as const;
type Kind = (typeof KINDS)[number];
// Every card is one height, so DragList can map a drag distance to a position.
const ROW = tokens.space[16] + tokens.space[1];
const RAIL = tokens.space[16] * 4 + tokens.space[6];

/**
 * Menu sections, food then drinks, each as a white card in guest order: the name and its dish
 * count, the ⋮ menu (edit, move, delete) and a handle to drag it. A dashed box at the end of
 * each list adds a section. Wide screens show the live menu card on the right.
 */
export function CategoriesScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { wide } = useOwnerLayout();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  // undefined = closed; null = a new section of `newKind`.
  const [editing, setEditing] = useState<MenuCategory | null | undefined>(undefined);
  const [newKind, setNewKind] = useState<Kind>('food');
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const items = desk.menu.data?.items ?? [];
  const dishCount = (id: string) => items.filter((item) => item.categoryId === id).length;
  const slug = desk.venue.data?.slug;

  const lists = KINDS.map((kind) => {
    const sections = desk.sectionsOf(kind);
    return (
      <View key={kind} style={styles.group}>
        <SectionLabel title={t(`ownerMenu.${kind}`)} caps />
        {sections.length > 0 ? (
          <DragList
            items={sections.map((s) => ({ key: s.id, label: s.name.en, section: s }))}
            rowHeight={ROW}
            handle="move"
            onOrder={(orderedIds) => desk.reorderSections.mutate({ kind, orderedIds })}
            renderRow={({ section }, index) => (
              <CategoryRow
                section={section}
                count={dishCount(section.id)}
                first={index === 0}
                last={index === sections.length - 1}
                busy={desk.move.isPending || desk.reorderSections.isPending}
                onMove={(direction) => desk.move.mutate({ id: section.id, direction, kind })}
                onEdit={() => setEditing(section)}
                onDelete={() => setDeleting(section)}
              />
            )}
          />
        ) : null}
        <Text variant="caption" style={[styles.count, { color: theme.muted }]}>
          {t('ownerMenu.sectionCount', { count: sections.length })}
        </Text>
        <AddDashed
          label={t(kind === 'food' ? 'ownerMenu.addFoodSection' : 'ownerMenu.addDrinksSection')}
          onPress={() => {
            setNewKind(kind);
            setEditing(null);
          }}
        />
      </View>
    );
  });

  return (
    <OwnerPage title={t('owner.categories')} subtitle={t('ownerMenu.categoriesLead')}>
      <DeskWait
        loading={desk.menu.isLoading || desk.venue.isLoading}
        error={desk.menu.isError || desk.venue.isError}
        onRetry={() => void desk.menu.refetch()}
      >
        <View style={wide ? styles.split : undefined}>
          <View style={[styles.main, wide && styles.mainWide]}>
            {lists}
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerMenu.dragHint')}
            </Text>
          </View>
          {wide && slug ? (
            <View style={styles.rail}>
              <LiveMenuCard slug={slug} />
            </View>
          ) : null}
        </View>
      </DeskWait>

      {/* Keyed per section so the form starts fresh and a background refresh never wipes typing. */}
      {editing !== undefined ? (
        <SectionEditor
          key={editing?.id ?? `new-${newKind}`}
          section={editing}
          kind={editing?.kind ?? newKind}
          venueId={venueId}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            void desk.refresh();
          }}
        />
      ) : null}
      <ConfirmDialog
        visible={deleting !== null}
        destructive
        title={t('ownerMenu.confirmDeleteTitle')}
        message={
          deleting
            ? t('ownerMenu.confirmDeleteSection', {
                name: deleting.name.en,
                count: dishCount(deleting.id),
              })
            : ''
        }
        confirmLabel={t('ownerMenu.delete')}
        onConfirm={() => {
          if (deleting) desk.removeSection.mutate(deleting.id);
          setDeleting(null);
        }}
        onCancel={() => setDeleting(null)}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  main: { gap: tokens.space[6] },
  mainWide: { flex: 1, minWidth: 0 },
  group: { gap: tokens.space[3] },
  count: { alignSelf: 'flex-end' },
  rail: { width: RAIL },
});
