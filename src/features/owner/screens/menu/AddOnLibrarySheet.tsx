import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { MenuItem, ModifierGroup } from '@/lib/api/types';
import { checkGroup } from '@/lib/addOns';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ConfirmDialog, ModalSheet } from '../../kit';
import { blankGroup, sizeGroup } from './addOnPresets';
import { GroupCard } from './GroupCard';
import { useAddOnLibrary } from './useAddOnLibrary';

type Editing = { group: ModifierGroup; isNew: boolean };

/**
 * Add-on groups many dishes share (Menu.modifierGroups). The sheet shows the list, or one group
 * being edited with the same card the dish page uses. Each dish picks groups on its own page.
 */
export function AddOnLibrarySheet({
  venueId,
  slug,
  library,
  dishes,
  onClose,
}: {
  venueId: string;
  slug: string;
  library: ModifierGroup[];
  dishes: MenuItem[];
  onClose: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { save, remove, inputOf } = useAddOnLibrary(venueId, slug);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [showError, setShowError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const usedBy = (id: string) => dishes.filter((d) => d.modifierGroupIds?.includes(id)).length;
  const problem = editing ? checkGroup(inputOf(editing.group)) : null;
  const open = (next: Editing | null) => {
    setEditing(next);
    setShowError(false);
  };

  const footer = editing ? (
    <View style={styles.footer}>
      {editing.isNew ? null : (
        <Button
          label={t('ownerMenu.library.delete')}
          tone="secondary"
          onPress={() => setDeleting(true)}
        />
      )}
      <Button
        label={t('ownerMenu.library.save')}
        style={styles.flex}
        loading={save.isPending}
        onPress={() =>
          problem ? setShowError(true) : save.mutate(editing, { onSuccess: () => open(null) })
        }
      />
    </View>
  ) : (
    <View style={styles.footer}>
      <Button
        label={t('ownerMenu.library.newSizes')}
        tone="secondary"
        style={styles.flex}
        onPress={() =>
          open({
            isNew: true,
            group: sizeGroup({
              name: t('ownerMenu.sizeName'),
              sizes: [
                t('ownerMenu.sizeSmall'),
                t('ownerMenu.sizeMedium'),
                t('ownerMenu.sizeLarge'),
              ],
            }),
          })
        }
      />
      <Button
        label={t('ownerMenu.library.new')}
        style={styles.flex}
        onPress={() => open({ isNew: true, group: blankGroup() })}
      />
    </View>
  );

  return (
    <ModalSheet
      visible
      onClose={onClose}
      title={editing ? t('ownerMenu.library.edit') : t('ownerMenu.library.title')}
      footer={footer}
    >
      {editing ? (
        <View style={styles.stack}>
          <Button
            label={t('ownerMenu.library.back')}
            tone="ghost"
            size="md"
            style={styles.back}
            onPress={() => open(null)}
          />
          <GroupCard
            group={editing.group}
            onChange={(group) => setEditing({ ...editing, group })}
            onRemove={() => (editing.isNew ? open(null) : setDeleting(true))}
          />
          {showError && problem ? (
            <Text variant="caption" style={{ color: theme.error }}>
              {t('ownerMenu.library.err')}
            </Text>
          ) : null}
        </View>
      ) : library.length === 0 ? (
        <Text style={{ color: theme.muted }}>{t('ownerMenu.library.empty')}</Text>
      ) : (
        <View style={[styles.list, { borderColor: theme.line }]}>
          {library.map((group, index) => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              onPress={() => open({ isNew: false, group })}
              style={({ pressed }) => [
                styles.row,
                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.line },
                pressed && { backgroundColor: theme.wash },
              ]}
            >
              <View style={styles.copy}>
                <Text variant="body-strong" numberOfLines={1}>
                  {group.name.en}
                </Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {[
                    t('ownerMenu.library.options', { count: group.options.length }),
                    t('ownerMenu.library.usedBy', { count: usedBy(group.id) }),
                  ].join(' · ')}
                </Text>
              </View>
              <ChevronRight size={18} color={theme.meta} />
            </Pressable>
          ))}
        </View>
      )}
      <ConfirmDialog
        visible={deleting && editing !== null}
        destructive
        title={t('ownerMenu.library.confirmDelete', { name: editing?.group.name.en ?? '' })}
        message={t('ownerMenu.library.confirmDeleteBody')}
        confirmLabel={t('ownerMenu.delete')}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          if (editing) remove.mutate(editing.group.id, { onSuccess: () => open(null) });
        }}
      />
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[3], alignItems: 'stretch' },
  footer: { flex: 1, flexDirection: 'row', gap: tokens.space[2] },
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start' },
  list: { borderWidth: 1, borderRadius: tokens.owner.controls.cardRadius, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 56,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[2],
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
});
