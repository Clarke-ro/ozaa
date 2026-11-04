import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MenuCategory } from '@/lib/api/types';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
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
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  // undefined = closed; null = a new section of `newKind`.
  const [editing, setEditing] = useState<MenuCategory | null | undefined>(undefined);
  const [newKind, setNewKind] = useState<Kind>('food');
  const [deleting, setDeleting] = useState<MenuCategory | null>(null);

  const items = desk.menu.data?.items ?? [];
  const dishCount = (id: string) => items.filter((item) => item.categoryId === id).length;

  return (
    <OwnerPage title={t('owner.categories')} subtitle={t('ownerMenu.sectionsLead')}>
      <DeskWait
        loading={desk.menu.isLoading || desk.venue.isLoading}
        error={desk.menu.isError || desk.venue.isError}
        onRetry={() => void desk.menu.refetch()}
      >
        {KINDS.map((kind) => {
          const sections = desk.sectionsOf(kind);
          return (
            <View key={kind} style={styles.group}>
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
        <Text variant="caption" style={{ color: theme.muted }}>
          {t('ownerMenu.orderHint')}
        </Text>
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
  group: { gap: tokens.space[2], marginBottom: tokens.space[4] },
});
