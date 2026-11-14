import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuItem, ModifierGroup } from '@/lib/api/types';
import { dishStatus, statusFields, type DishStatus } from '@/lib/dishRules';
import { toast } from '../../kit';
import { checkDish, checkStock } from './forms';
import type { StockDraft } from './DishStockFields';

/** Everything the dish page edits, its checks, and the save. A null item is a new dish. */
export function useDishForm({
  item,
  venueId,
  defaultSectionId,
  onSaved,
}: {
  item: MenuItem | null;
  venueId: string;
  defaultSectionId: string;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(item?.name.en ?? '');
  const [description, setDescription] = useState(item?.description?.en ?? '');
  const [price, setPrice] = useState(item ? (item.pricePesewas / 100).toFixed(2) : '');
  const [sectionId, setSectionId] = useState(item?.categoryId ?? defaultSectionId);
  const [status, setStatus] = useState<DishStatus>(item ? dishStatus(item) : 'available');
  const [stockDraft, setStockDraft] = useState<StockDraft>({
    salePrice: item?.salePricePesewas != null ? (item.salePricePesewas / 100).toFixed(2) : '',
    stock: item?.stockCount != null ? String(item.stockCount) : '',
    minQuantity: item?.minQuantity != null ? String(item.minQuantity) : '',
    maxQuantity: item?.maxQuantity != null ? String(item.maxQuantity) : '',
  });
  const [calories, setCalories] = useState(item?.calories ? String(item.calories) : '');
  const [dietary, setDietary] = useState<MenuItem['dietary']>(item?.dietary ?? []);
  const [badges, setBadges] = useState<MenuItem['badges']>(item?.badges ?? []);
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
        badges,
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

  const togglePopular = (on: boolean) =>
    setBadges((now) => (on ? [...now, 'popular'] : now.filter((b) => b !== 'popular')));

  return {
    fields: {
      name,
      description,
      price,
      sectionId,
      status,
      stockDraft,
      calories,
      dietary,
      badges,
      dietaryCustom,
      allergens,
      groups,
      photoUrl,
    },
    set: {
      name: setName,
      description: setDescription,
      price: setPrice,
      sectionId: setSectionId,
      status: setStatus,
      stockDraft: setStockDraft,
      calories: setCalories,
      dietary: setDietary,
      dietaryCustom: setDietaryCustom,
      allergens: setAllergens,
      groups: setGroups,
      togglePopular,
      photo: (mediaId: string | null, url: string | null) => {
        setPhotoMediaId(mediaId);
        setPhotoUrl(url);
      },
    },
    error,
    saving: save.isPending,
    submit: () => (failed === null ? save.mutate() : setShowErrors(true)),
  };
}
