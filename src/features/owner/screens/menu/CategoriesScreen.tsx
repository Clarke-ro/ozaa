import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { ConfirmDialog, SectionLabel } from '../../kit';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { SectionEditor } from './SectionEditor';
import { SectionsList } from './SectionsList';
import { useMenuDesk } from './useMenuDesk';

const KINDS = ['food', 'drinks'] as const;
type Kind = (typeof KINDS)[number];

/** Menu sections on their own page: food and drinks, in guest order, with add, edit, move and delete. */
export function CategoriesScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const twoCol = width >= 900;
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  const [editing, setEditing] = useState<MenuCategory | null | undefined>(undefined);
  const [newKind, setNewKind] = useState<Kind>('food');
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const items = desk.menu.data?.items ?? [];
  const dishCount = (id: string) => items.filter((item) => item.categoryId === id).length;

  return (
    <OwnerPage title={t('owner.categories')}>
      <DeskWait
        loading={desk.menu.isLoading || desk.venue.isLoading}
        error={desk.menu.isError || desk.venue.isError}
        onRetry={() => void desk.menu.refetch()}
      >
        <View style={[styles.stack, twoCol && styles.split]}>
          {KINDS.map((kind) => {
            const sections = desk.sectionsOf(kind);
            return (
              <View key={kind} style={[styles.group, twoCol && styles.col]}>
                <SectionLabel title={t(`ownerMenu.${kind}`)} caps />
                <SectionsList
                  sections={sections}
                  counts={Object.fromEntries(sections.map((s) => [s.id, dishCount(s.id)]))}
                  busy={desk.move.isPending}
                  onMove={(id, direction) => desk.move.mutate({ id, direction, kind })}
                  onEdit={setEditing}
                  onDelete={setDeleting}
                  onAdd={() => {
                    setNewKind(kind);
                    setEditing(null);
                  }}
                />
              </View>
            );
          })}
        </View>
      </DeskWait>

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
  stack: { gap: tokens.space[5] },
  split: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[5] },
  col: { flex: 1, minWidth: 0 },
  group: { gap: tokens.space[2] },
});
