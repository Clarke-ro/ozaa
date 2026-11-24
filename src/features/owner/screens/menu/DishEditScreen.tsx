import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react-native';
import type { MenuCategory, MenuItem, ModifierGroup } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { useOwnerSession } from '@/features/session';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { ConfirmDialog, EmptyCard } from '../../kit';
import { DishForm } from './DishForm';
import { useMenuDesk } from './useMenuDesk';

/**
 * One dish on its own page (canvas): "new" adds one, otherwise its id edits it. Save, Cancel and
 * Delete sit at the bottom, like the canvas. Afterwards the owner goes back to the menu.
 */
export function DishEditScreen({ dishId, sectionId }: { dishId: string; sectionId?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const desk = useMenuDesk(venueId);
  const [deleting, setDeleting] = useState(false);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/owner/menu'));
  const fresh = dishId === 'new';
  const item = fresh ? null : (desk.menu.data?.items.find((i) => i.id === dishId) ?? null);
  const sections: MenuCategory[] = [...desk.sectionsOf('food'), ...desk.sectionsOf('drinks')];
  const section = sections.find((s) => s.id === item?.categoryId);
  const loading = desk.menu.isPending || desk.venue.isPending;

  return (
    <OwnerPage
      title={item ? item.name.en : t('ownerMenu.addDish')}
      subtitle={
        item
          ? [section?.name.en, formatMoney(pesewas(item.pricePesewas), desk.currency)]
              .filter(Boolean)
              .join(' · ')
          : undefined
      }
      back={{ label: t('owner.menu'), onPress: back }}
    >
      <DeskWait loading={loading} error={desk.menu.isError} onRetry={() => void desk.refresh()}>
        {fresh || item ? (
          <DishBody
            key={item?.id ?? 'new'}
            item={item}
            sections={sections}
            defaultSectionId={sectionId ?? sections[0]?.id ?? ''}
            venueId={venueId}
            currency={desk.currency}
            library={desk.menu.data?.modifierGroups ?? []}
            timeZone={desk.timeZone}
            onDone={() => {
              void desk.refresh();
              back();
            }}
            onCancel={back}
            onDelete={item ? () => setDeleting(true) : undefined}
          />
        ) : desk.menu.data ? (
          <EmptyCard
            icon={SearchX}
            title={t('ownerMenu.dishMissing')}
            description={t('ownerMenu.dishMissingBody')}
            actionLabel={t('owner.menu')}
            onAction={back}
          />
        ) : null}
      </DeskWait>
      <ConfirmDialog
        visible={deleting && item != null}
        destructive
        title={t('ownerMenu.confirmDeleteTitle')}
        message={t('ownerMenu.confirmDeleteDish', { name: item?.name.en ?? '' })}
        confirmLabel={t('ownerMenu.delete')}
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          if (item) desk.removeItem.mutate(item.id, { onSuccess: back });
          setDeleting(false);
        }}
      />
    </OwnerPage>
  );
}

function DishBody({
  onCancel,
  onDelete,
  ...props
}: {
  item: MenuItem | null;
  sections: MenuCategory[];
  defaultSectionId: string;
  venueId: string;
  currency: string;
  library: ModifierGroup[];
  timeZone: string;
  onDone: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <DishForm {...props}>
      {(form) => (
        <View style={styles.actions}>
          {onDelete ? (
            <Button
              label={t('ownerMenu.deleteDish')}
              tone="secondary"
              labelColor={theme.error}
              onPress={onDelete}
              style={styles.short}
            />
          ) : null}
          <View style={styles.spacer} />
          <Button
            label={t('ownerKit.cancel')}
            tone="secondary"
            onPress={onCancel}
            style={styles.short}
          />
          <Button
            label={props.item ? t('ownerMenu.saveDish') : t('ownerMenu.addDish')}
            loading={form.saving}
            onPress={form.submit}
            style={styles.short}
          />
        </View>
      )}
    </DishForm>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  spacer: { flex: 1 },
  short: { minHeight: 40 },
});
