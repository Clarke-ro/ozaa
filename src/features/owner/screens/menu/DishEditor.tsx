import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuCategory, MenuItem, ModifierGroup } from '@/lib/api/types';
import { dishStatus, statusFields, type DishStatus } from '@/lib/dishRules';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Chips, Field, ModalSheet, PhotoField, Section, SectionBody, toast } from '../../kit';
import { AddOnsEditor } from './AddOnsEditor';
import { checkDish, checkStock } from './forms';
import { DishStockFields, type StockDraft } from './DishStockFields';
import { DishTags } from './DishTags';

/** Full-screen form for one dish or drink. Save is pinned at the bottom so it is always in reach. */
export function DishEditor({
  item,
  sections,
  defaultSectionId,
  venueId,
  currency,
  onClose,
  onSaved,
  onDelete,
}: {
  item: MenuItem | null;
  sections: MenuCategory[];
  defaultSectionId?: string;
  venueId: string;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
  /** Shown for an existing dish; the screen asks to confirm. */
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState(item?.name.en ?? '');
  const [description, setDescription] = useState(item?.description?.en ?? '');
  const [price, setPrice] = useState(item ? (item.pricePesewas / 100).toFixed(2) : '');
  const [sectionId, setSectionId] = useState(
    item?.categoryId ?? defaultSectionId ?? sections[0]?.id ?? '',
  );
  const [status, setStatus] = useState<DishStatus>(item ? dishStatus(item) : 'available');
  const [stockDraft, setStockDraft] = useState<StockDraft>({
    salePrice: item?.salePricePesewas != null ? (item.salePricePesewas / 100).toFixed(2) : '',
    stock: item?.stockCount != null ? String(item.stockCount) : '',
    minQuantity: item?.minQuantity != null ? String(item.minQuantity) : '',
    maxQuantity: item?.maxQuantity != null ? String(item.maxQuantity) : '',
  });
  const [calories, setCalories] = useState(item?.calories ? String(item.calories) : '');
  const [dietary, setDietary] = useState<MenuItem['dietary']>(item?.dietary ?? []);
  const [dietaryCustom, setDietaryCustom] = useState<string[]>(item?.dietaryCustom ?? []);
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ?? []);
  const [groups, setGroups] = useState<ModifierGroup[]>(item?.modifierGroups ?? []);
  // undefined keeps the current photo; null removes it; a string is a new upload.
  const [photoMediaId, setPhotoMediaId] = useState<string | null | undefined>(undefined);
  const [photoUrl, setPhotoUrl] = useState<string | null>(item?.photo?.url ?? null);
  const [showErrors, setShowErrors] = useState(false);

  const dish = checkDish({ name, price, categoryId: sectionId, groups });
  const stock = checkStock({ pricePesewas: dish.ok ? dish.pricePesewas : 0, ...stockDraft });
  // The first problem wins, top of the form first, so the owner fixes one thing at a time.
  const failed = !dish.ok ? dish.field : !stock.ok ? stock.field : null;
  const error = (field: string) =>
    showErrors && failed === field ? t(`ownerMenu.err.${field}`) : undefined;

  const save = useMutation({
    mutationFn: () => {
      if (!dish.ok || !stock.ok) throw new Error('invalid');
      const body = {
        name: { ...item?.name, en: dish.name },
        description: { ...item?.description, en: description.trim() },
        pricePesewas: dish.pricePesewas,
        categoryId: sectionId,
        ...statusFields(status),
        salePricePesewas: stock.salePricePesewas,
        stockCount: stock.stockCount,
        minQuantity: stock.minQuantity,
        maxQuantity: stock.maxQuantity,
        dietary,
        dietaryCustom,
        allergens,
        calories: calories.trim() ? Number.parseInt(calories, 10) || undefined : undefined,
        modifierGroups: groups,
        ...(photoMediaId === undefined ? {} : { photoMediaId }),
      };
      return item
        ? api.ownerUpdateItem(venueId, item.id, body)
        : api.ownerCreateItem(venueId, body);
    },
    onSuccess: () => {
      toast.success(t('ownerKit.saved'));
      onSaved();
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });

  return (
    <ModalSheet
      visible
      fullScreen
      onClose={onClose}
      title={item ? t('ownerMenu.editDish') : t('ownerMenu.addDish')}
      footer={
        <Button
          label={item ? t('ownerKit.save') : t('ownerMenu.addDish')}
          style={styles.flex}
          loading={save.isPending}
          onPress={() => (failed === null ? save.mutate() : setShowErrors(true))}
        />
      }
    >
      <PhotoField
        venueId={venueId}
        url={photoUrl}
        label={t('ownerMenu.photo')}
        onChange={(mediaId, url) => {
          setPhotoMediaId(mediaId);
          setPhotoUrl(url);
        }}
      />
      <Field
        label={t('ownerMenu.dishName')}
        value={name}
        onChangeText={setName}
        placeholder={t('ownerMenu.dishNameHint')}
        error={error('name')}
        autoCapitalize="sentences"
      />
      <Field
        label={t('ownerMenu.description')}
        value={description}
        onChangeText={setDescription}
        placeholder={t('ownerMenu.descriptionHint')}
        multiline
      />
      <Field
        label={t('ownerMenu.price', { currency })}
        value={price}
        onChangeText={setPrice}
        placeholder="65.00"
        keyboardType="decimal-pad"
        error={error('price')}
      />

      <Section title={t('ownerMenu.section')}>
        <SectionBody>
          <Chips
            single
            label={t('ownerMenu.section')}
            options={sections.map((s) => ({ id: s.id, label: s.name.en }))}
            selected={[sectionId]}
            onChange={(ids) => setSectionId(ids[0] ?? '')}
          />
          {error('section') ? (
            <Text variant="caption" style={{ color: theme.error }}>
              {error('section')}
            </Text>
          ) : null}
        </SectionBody>
      </Section>

      <Section title={t('ownerMenu.pricingStock')}>
        <SectionBody>
          <DishStockFields
            status={status}
            onStatus={setStatus}
            draft={stockDraft}
            onDraft={setStockDraft}
            currency={currency}
            error={error}
          />
        </SectionBody>
      </Section>

      <DishTags
        dietary={dietary}
        dietaryCustom={dietaryCustom}
        allergens={allergens}
        onDietary={setDietary}
        onDietaryCustom={setDietaryCustom}
        onAllergens={setAllergens}
      />

      <Section
        title={t('ownerMenu.addOnsTitle')}
        note={error('addOns') ?? t('ownerMenu.addOnsNote')}
      >
        <SectionBody>
          <AddOnsEditor groups={groups} onChange={setGroups} />
        </SectionBody>
      </Section>

      <Field
        label={t('ownerMenu.calories')}
        value={calories}
        onChangeText={setCalories}
        placeholder="520"
        keyboardType="number-pad"
      />

      {item && onDelete ? (
        <Button label={t('ownerMenu.deleteDish')} tone="destructive" onPress={onDelete} />
      ) : null}
    </ModalSheet>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
