import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ChevronDown,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuCategory, MenuItem, ModifierGroup } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney, parseMoneyInput } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { isCategoryActiveNow, DAYS_OF_WEEK } from '@/features/menu/menuSchedule';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import {
  ChipRow,
  ConfirmDialog,
  DeskCard,
  DeskTabs,
  EmptyCard,
  Field,
  IconTile,
  ModalSheet,
  SectionLabel,
  StatusPill,
  Toggle,
} from '../kit';

const DIET_TAGS = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy'] as const;

const STANDARD_ALLERGENS = [
  'celery',
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'lupin',
  'milk',
  'molluscs',
  'mustard',
  'tree_nuts',
  'peanuts',
  'sesame',
  'soya',
  'sulphites',
] as const;

export function MenuDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();

  const venue = useQuery({
    queryKey: ['owner-venue', venueId],
    queryFn: () => api.ownerGetVenue(venueId),
    enabled: Boolean(venueId),
  });

  const slug = venue.data?.slug ?? '';
  const menu = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });

  const [kind, setKind] = useState<'food' | 'drinks'>('food');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Confirm delete states
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'item' | 'category';
    id: string;
    name: string;
  } | null>(null);

  const refresh = () => void client.invalidateQueries({ queryKey: ['menu', slug] });

  // Toggle item availability
  const toggleAvailable = useMutation({
    mutationFn: (item: MenuItem) =>
      api.ownerUpdateItem(venueId, item.id, { available: !item.available }),
    onSuccess: refresh,
  });

  // Bulk 86 action for category
  const bulkToggleAvailable = useMutation({
    mutationFn: async ({ categoryId, setAvailable }: { categoryId: string; setAvailable: boolean }) => {
      const itemsToUpdate = (menu.data?.items ?? []).filter((i) =>
        categoryId === 'all'
          ? (menu.data?.categories ?? []).find((c) => c.id === i.categoryId)?.kind === kind
          : i.categoryId === categoryId
      );
      for (const item of itemsToUpdate) {
        if (item.available !== setAvailable) {
          await api.ownerUpdateItem(venueId, item.id, { available: setAvailable });
        }
      }
    },
    onSuccess: refresh,
  });

  // Delete item mutation
  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => api.ownerDeleteItem(venueId, itemId),
    onSuccess: () => {
      setDeleteConfirm(null);
      refresh();
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (catId: string) => api.ownerDeleteCategory(venueId, catId),
    onSuccess: () => {
      setDeleteConfirm(null);
      if (selectedCat === deleteConfirm?.id) {
        setSelectedCat('all');
      }
      refresh();
    },
  });

  const categories = (menu.data?.categories ?? []).filter((c) => c.kind === kind);
  const allItems = menu.data?.items ?? [];

  // Filter items by category, kind, and search query
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const itemCat = (menu.data?.categories ?? []).find((c) => c.id === item.categoryId);
      if (!itemCat || itemCat.kind !== kind) return false;
      if (selectedCat !== 'all' && item.categoryId !== selectedCat) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.en?.toLowerCase().includes(q);
        const matchesDesc = item.description?.en?.toLowerCase().includes(q);
        return matchesName || matchesDesc;
      }
      return true;
    });
  }, [allItems, menu.data?.categories, kind, selectedCat, searchQuery]);

  const kindTabs = [
    {
      id: 'food' as const,
      label: 'Food',
      count: allItems.filter((i) =>
        (menu.data?.categories ?? []).find((c) => c.id === i.categoryId)?.kind === 'food'
      ).length,
    },
    {
      id: 'drinks' as const,
      label: 'Drinks',
      count: allItems.filter((i) =>
        (menu.data?.categories ?? []).find((c) => c.id === i.categoryId)?.kind === 'drinks'
      ).length,
    },
  ];

  const categoryChips = [
    { id: 'all', label: 'All items' },
    ...categories.map((c) => ({
      id: c.id,
      label: c.name.en + (c.hidden ? ' (Hidden)' : ''),
    })),
  ];

  const currentCategoryObj = categories.find((c) => c.id === selectedCat);

  return (
    <OwnerPage
      title={t('owner.menu')}
      subtitle="Manage dishes, drinks, prices, modifiers, 86 sold-out status, and schedules."
    >
      <DeskWait
        loading={menu.isLoading || venue.isLoading}
        error={menu.isError || venue.isError}
        onRetry={() => void menu.refetch()}
      >
        <View style={styles.stack}>
          {/* Top Actions Bar */}
          <View style={styles.topActionsRow}>
            <View style={styles.searchBox}>
              <Search size={18} color={theme.meta} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search dishes, drinks, ingredients..."
                placeholderTextColor={theme.meta}
                style={[styles.searchInput, { color: theme.text }]}
              />
              {searchQuery ? (
                <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                  <X size={16} color={theme.meta} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.buttonsGroup}>
              <Button
                label="New dish"
                tone="primary"
                onPress={() => {
                  setEditingItem(null);
                  setItemModalOpen(true);
                }}
              />
              <Button
                label="New category"
                tone="secondary"
                onPress={() => {
                  setEditingCategory(null);
                  setCategoryModalOpen(true);
                }}
              />
            </View>
          </View>

          {/* Kind Tabs (Food vs Drinks) */}
          <DeskTabs tabs={kindTabs} value={kind} onChange={setKind} />

          {/* Categories Chip Bar */}
          <View style={styles.categoryBar}>
            <ChipRow items={categoryChips} value={selectedCat} onChange={setSelectedCat} />
          </View>

          {/* Current Category Actions Strip (if a specific category is selected) */}
          {currentCategoryObj ? (
            <View style={[styles.catToolbar, { backgroundColor: theme.wash, borderColor: theme.line }]}>
              <View style={styles.catToolbarInfo}>
                <Text variant="body-strong">{currentCategoryObj.name.en}</Text>
                {currentCategoryObj.schedule ? (
                  <View style={styles.scheduleBadge}>
                    <Clock size={12} color={theme.meta} />
                    <Text variant="caption" style={{ color: theme.meta }}>
                      {currentCategoryObj.schedule.startTime} - {currentCategoryObj.schedule.endTime}
                      {currentCategoryObj.schedule.days ? ` (${currentCategoryObj.schedule.days.length} days)` : ''}
                    </Text>
                  </View>
                ) : null}
                {currentCategoryObj.hidden ? (
                  <View style={[styles.hiddenBadge, { backgroundColor: '#FEE2E2' }]}>
                    <EyeOff size={12} color="#DC2626" />
                    <Text variant="caption" style={{ color: '#DC2626', fontWeight: '700' }}>
                      Hidden from guests
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.catToolbarActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit category"
                  onPress={() => {
                    setEditingCategory(currentCategoryObj);
                    setCategoryModalOpen(true);
                  }}
                  style={styles.actionIconBtn}
                >
                  <Edit2 size={16} color={theme.text} />
                  <Text variant="caption" style={{ fontWeight: '600' }}>
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete category"
                  onPress={() =>
                    setDeleteConfirm({
                      type: 'category',
                      id: currentCategoryObj.id,
                      name: currentCategoryObj.name.en,
                    })
                  }
                  style={styles.actionIconBtn}
                >
                  <Trash2 size={16} color="#DC2626" />
                  <Text variant="caption" style={{ color: '#DC2626', fontWeight: '600' }}>
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {/* Quick Bulk 86 Bar */}
          <View style={styles.bulkRow}>
            <Text variant="caption" style={{ color: theme.meta }}>
              Showing {filteredItems.length} item{filteredItems.length === 1 ? '' : 's'}
            </Text>

            <View style={styles.bulkActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  bulkToggleAvailable.mutate({
                    categoryId: selectedCat,
                    setAvailable: false,
                  })
                }
                disabled={bulkToggleAvailable.isPending}
                style={[styles.bulkBtn, { borderColor: theme.line }]}
              >
                <Text variant="caption" style={{ color: theme.text, fontWeight: '600' }}>
                  Mark all sold out (86)
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  bulkToggleAvailable.mutate({
                    categoryId: selectedCat,
                    setAvailable: true,
                  })
                }
                disabled={bulkToggleAvailable.isPending}
                style={[styles.bulkBtn, { borderColor: theme.line, backgroundColor: theme.wash }]}
              >
                <Text variant="caption" style={{ color: theme.text, fontWeight: '600' }}>
                  Mark all available
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <EmptyCard
              icon={UtensilsCrossed}
              title={searchQuery ? 'No dishes match your search' : 'No dishes in this category'}
              description={
                searchQuery
                  ? 'Try searching with different keywords or clear the filter.'
                  : 'Add delicious items to this section so guests can order from your table QR.'
              }
              actionLabel="Add new dish"
              onAction={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
            />
          ) : (
            <View style={styles.itemsList}>
              {filteredItems.map((item) => {
                const itemCategory = (menu.data?.categories ?? []).find(
                  (c) => c.id === item.categoryId
                );

                return (
                  <DeskCard
                    key={item.id}
                    tone={item.available ? 'plain' : 'wash'}
                    style={styles.itemCard}
                  >
                    <View style={styles.itemMainRow}>
                      <View style={styles.itemInfo}>
                        <View style={styles.nameHeaderRow}>
                          <Text
                            variant="title"
                            style={[
                              styles.itemName,
                              !item.available && { color: theme.meta },
                            ]}
                          >
                            {item.name.en}
                          </Text>
                          {itemCategory && selectedCat === 'all' ? (
                            <View style={styles.catPill}>
                              <Text variant="caption" style={styles.catPillText}>
                                {itemCategory.name.en}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {item.description?.en ? (
                          <Text
                            variant="caption"
                            style={[styles.itemDesc, { color: theme.meta }]}
                            numberOfLines={2}
                          >
                            {item.description.en}
                          </Text>
                        ) : null}

                        <View style={styles.metaRow}>
                          <Text
                            variant="body-strong"
                            style={[styles.itemPrice, { fontVariant: ['tabular-nums'] }]}
                          >
                            {formatMoney(pesewas(item.pricePesewas), venue.data?.currency ?? 'GHS')}
                          </Text>

                          {item.calories ? (
                            <Text variant="caption" style={{ color: theme.meta }}>
                              • {item.calories} kcal
                            </Text>
                          ) : null}

                          {item.modifierGroups && item.modifierGroups.length > 0 ? (
                            <View style={[styles.modPill, { backgroundColor: '#F0F9FF' }]}>
                              <Text variant="caption" style={{ color: '#0369A1', fontWeight: '600' }}>
                                {item.modifierGroups.length} modifier group{item.modifierGroups.length > 1 ? 's' : ''}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        {/* Dietary & Allergen chips */}
                        <View style={styles.chipsRow}>
                          {item.dietary?.map((d) => (
                            <View key={d} style={styles.dietPill}>
                              <Text variant="caption" style={styles.dietPillText}>
                                {t(`dietary.${d}`)}
                              </Text>
                            </View>
                          ))}

                          {item.allergens?.map((a) => (
                            <View key={a} style={[styles.allergenPill, { backgroundColor: '#FEF3C7' }]}>
                              <Text variant="caption" style={{ color: '#92400E', fontSize: 11, fontWeight: '600' }}>
                                Contains: {a}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>

                      {/* Right controls: Available toggle & Edit/Delete icons */}
                      <View style={styles.itemControls}>
                        <View style={styles.toggleCol}>
                          <Toggle
                            value={item.available}
                            onChange={() => toggleAvailable.mutate(item)}
                            label={item.name.en}
                            disabled={toggleAvailable.isPending}
                          />
                          <Text
                            variant="caption"
                            style={{
                              color: item.available ? theme.success : theme.fill,
                              fontFamily: 'Inter_600',
                            }}
                          >
                            {item.available ? t('owner.onMenu') : t('owner.soldOut')}
                          </Text>
                        </View>

                        <View style={styles.cardActionsCol}>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${item.name.en}`}
                            onPress={() => {
                              setEditingItem(item);
                              setItemModalOpen(true);
                            }}
                            style={[styles.smallIconBtn, { backgroundColor: theme.wash }]}
                          >
                            <Edit2 size={16} color={theme.text} />
                          </Pressable>

                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Delete ${item.name.en}`}
                            onPress={() =>
                              setDeleteConfirm({
                                type: 'item',
                                id: item.id,
                                name: item.name.en,
                              })
                            }
                            style={[styles.smallIconBtn, { backgroundColor: '#FEE2E2' }]}
                          >
                            <Trash2 size={16} color="#DC2626" />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  </DeskCard>
                );
              })}
            </View>
          )}
        </View>

        {/* Category Edit/Create Modal */}
        <CategoryModal
          visible={categoryModalOpen}
          category={editingCategory}
          kind={kind}
          venueId={venueId}
          onClose={() => setCategoryModalOpen(false)}
          onSaved={() => {
            setCategoryModalOpen(false);
            refresh();
          }}
        />

        {/* Item Edit/Create Modal */}
        <ItemModal
          visible={itemModalOpen}
          item={editingItem}
          categories={categories}
          defaultCategoryId={selectedCat !== 'all' ? selectedCat : categories[0]?.id}
          venueId={venueId}
          currency={venue.data?.currency ?? 'GHS'}
          onClose={() => setItemModalOpen(false)}
          onSaved={() => {
            setItemModalOpen(false);
            refresh();
          }}
        />

        {/* Confirm Delete Dialog */}
        <ConfirmDialog
          visible={Boolean(deleteConfirm)}
          title={`Delete ${deleteConfirm?.type === 'category' ? 'Category' : 'Item'}`}
          message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          destructive
          loading={deleteItemMutation.isPending || deleteCategoryMutation.isPending}
          onConfirm={() => {
            if (deleteConfirm?.type === 'item') {
              deleteItemMutation.mutate(deleteConfirm.id);
            } else if (deleteConfirm?.type === 'category') {
              deleteCategoryMutation.mutate(deleteConfirm.id);
            }
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      </DeskWait>
    </OwnerPage>
  );
}

// ==========================================
// Category Modal Component
// ==========================================
function CategoryModal({
  visible,
  category,
  kind,
  venueId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  category: MenuCategory | null;
  kind: 'food' | 'drinks';
  venueId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [name, setName] = useState(category?.name.en ?? '');
  const [hasSchedule, setHasSchedule] = useState(Boolean(category?.schedule));
  const [days, setDays] = useState<number[]>(category?.schedule?.days ? [...category.schedule.days] : [1, 2, 3, 4, 5, 6, 7]);
  const [startTime, setStartTime] = useState(category?.schedule?.startTime ?? '11:00');
  const [endTime, setEndTime] = useState(category?.schedule?.endTime ?? '22:00');
  const [hidden, setHidden] = useState(category?.hidden ?? false);

  useMemo(() => {
    if (visible) {
      setName(category?.name.en ?? '');
      setHasSchedule(Boolean(category?.schedule));
      setDays(category?.schedule?.days ? [...category.schedule.days] : [1, 2, 3, 4, 5, 6, 7]);
      setStartTime(category?.schedule?.startTime ?? '11:00');
      setEndTime(category?.schedule?.endTime ?? '22:00');
      setHidden(category?.hidden ?? false);
    }
  }, [visible, category]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const schedule = hasSchedule
        ? {
            days,
            startTime,
            endTime,
          }
        : undefined;

      if (category) {
        return api.ownerUpdateCategory(venueId, category.id, {
          name: { en: name.trim() },
          kind,
          schedule,
          hidden,
        });
      } else {
        return api.ownerCreateCategory(venueId, {
          name: { en: name.trim() },
          kind,
          schedule,
          hidden,
        });
      }
    },
    onSuccess: onSaved,
  });

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={category ? 'Edit Category' : 'New Category'}
      subtitle={`Group your ${kind} items for guests to browse easily.`}
    >
      <View style={modalStyles.formStack}>
        <Field
          label="Category Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mains, Starters, Cocktails"
        />

        <View style={modalStyles.switchRow}>
          <View style={modalStyles.switchText}>
            <Text variant="body-strong">Hide from diners</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              Keep this category and its dishes invisible on the guest menu.
            </Text>
          </View>
          <Toggle value={hidden} onChange={() => setHidden(!hidden)} label="Hide category" />
        </View>

        {/* Schedule Section */}
        <View style={[modalStyles.sectionCard, { borderColor: theme.line }]}>
          <View style={modalStyles.switchRow}>
            <View style={modalStyles.switchText}>
              <Text variant="body-strong">Serving Schedule</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Only show during specific hours (e.g. Breakfast, Lunch, Late Night).
              </Text>
            </View>
            <Toggle
              value={hasSchedule}
              onChange={() => setHasSchedule(!hasSchedule)}
              label="Enable schedule"
            />
          </View>

          {hasSchedule ? (
            <View style={modalStyles.scheduleFields}>
              <Text variant="caption" style={{ color: theme.meta, fontWeight: '600' }}>
                Active Days
              </Text>
              <View style={modalStyles.daysRow}>
                {DAYS_OF_WEEK.map((dayName: string, idx: number) => {
                  const dayNum = idx + 1;
                  const selected = days.includes(dayNum);
                  return (
                    <Pressable
                      key={dayNum}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        setDays(
                          selected
                            ? days.filter((d) => d !== dayNum)
                            : [...days, dayNum].sort()
                        );
                      }}
                      style={[
                        modalStyles.dayPill,
                        {
                          borderColor: selected ? theme.fill : theme.line,
                          backgroundColor: selected ? theme.fill : theme.white,
                        },
                      ]}
                    >
                      <Text
                        variant="caption"
                        style={{
                          color: selected ? theme.white : theme.text,
                          fontWeight: '700',
                          fontSize: 11,
                        }}
                      >
                        {dayName.slice(0, 3)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={modalStyles.timeRow}>
                <Field
                  label="Start Time (24h)"
                  value={startTime}
                  onChangeText={setStartTime}
                  placeholder="08:00"
                  style={{ flex: 1 }}
                />
                <Field
                  label="End Time (24h)"
                  value={endTime}
                  onChangeText={setEndTime}
                  placeholder="11:30"
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          ) : null}
        </View>

        <View style={modalStyles.footerBtns}>
          <Button
            label="Save category"
            tone="primary"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!name.trim()}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

// ==========================================
// Item Modal Component (Dish / Drink)
// ==========================================
function ItemModal({
  visible,
  item,
  categories,
  defaultCategoryId,
  venueId,
  currency,
  onClose,
  onSaved,
}: {
  visible: boolean;
  item: MenuItem | null;
  categories: MenuCategory[];
  defaultCategoryId?: string;
  venueId: string;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [name, setName] = useState(item?.name.en ?? '');
  const [description, setDescription] = useState(item?.description?.en ?? '');
  const [priceStr, setPriceStr] = useState(
    item ? (item.pricePesewas / 100).toFixed(2) : ''
  );
  const [categoryId, setCategoryId] = useState(
    item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? ''
  );
  const [available, setAvailable] = useState(item?.available ?? true);
  const [calories, setCalories] = useState(item?.calories ? String(item.calories) : '');
  const [dietary, setDietary] = useState<string[]>(item?.dietary ? [...item.dietary] : []);
  const [allergens, setAllergens] = useState<string[]>(item?.allergens ? [...item.allergens] : []);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(
    item?.modifierGroups ? JSON.parse(JSON.stringify(item.modifierGroups)) : []
  );

  useMemo(() => {
    if (visible) {
      setName(item?.name.en ?? '');
      setDescription(item?.description?.en ?? '');
      setPriceStr(item ? (item.pricePesewas / 100).toFixed(2) : '');
      setCategoryId(item?.categoryId ?? defaultCategoryId ?? categories[0]?.id ?? '');
      setAvailable(item?.available ?? true);
      setCalories(item?.calories ? String(item.calories) : '');
      setDietary(item?.dietary ? [...item.dietary] : []);
      setAllergens(item?.allergens ? [...item.allergens] : []);
      setModifierGroups(
        item?.modifierGroups ? JSON.parse(JSON.stringify(item.modifierGroups)) : []
      );
    }
  }, [visible, item, defaultCategoryId, categories]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amountPesewas = parseMoneyInput(priceStr);
      if (!amountPesewas) throw new Error('Invalid price');

      const payload = {
        name: { en: name.trim() },
        description: { en: description.trim() },
        pricePesewas: amountPesewas,
        categoryId,
        available,
        dietary: dietary as any,
        allergens,
        calories: calories.trim() ? parseInt(calories, 10) : undefined,
        modifierGroups,
      };

      if (item) {
        return api.ownerUpdateItem(venueId, item.id, payload);
      } else {
        return api.ownerCreateItem(venueId, payload);
      }
    },
    onSuccess: onSaved,
  });

  const addModifierGroup = () => {
    setModifierGroups((curr) => [
      ...curr,
      {
        id: 'mod_' + Date.now(),
        name: { en: 'Choose an option' },
        min: 0,
        max: 1,
        options: [
          {
            id: 'opt_' + Date.now(),
            name: { en: 'Standard' },
            pricePesewas: 0 as any,
          },
        ],
      },
    ]);
  };

  const removeModifierGroup = (index: number) => {
    setModifierGroups((curr) => curr.filter((_, i) => i !== index));
  };

  const addOptionToGroup = (groupIndex: number) => {
    setModifierGroups((curr) => {
      const next = [...curr];
      const g = { ...next[groupIndex] };
      g.options = [
        ...(g.options ?? []),
        {
          id: 'opt_' + Date.now(),
          name: { en: '' },
          pricePesewas: 0 as any,
        },
      ];
      next[groupIndex] = g as ModifierGroup;
      return next;
    });
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={item ? 'Edit Dish / Drink' : 'New Dish / Drink'}
      subtitle="Details, pricing, allergens and modifier options."
      maxWidth={640}
    >
      <View style={modalStyles.formStack}>
        {/* Category Picker */}
        <View style={modalStyles.catSelectWrap}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '600' }}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.catScroll}>
            {categories.map((c) => {
              const active = c.id === categoryId;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: active }}
                  onPress={() => setCategoryId(c.id)}
                  style={[
                    modalStyles.catRadioBtn,
                    {
                      borderColor: active ? theme.fill : theme.line,
                      backgroundColor: active ? theme.wash : theme.white,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? theme.fill : theme.text,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {c.name.en}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <Field
          label="Item Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Jollof Rice with Grilled Tilapia"
        />

        <Field
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Fragrant spiced jasmine rice served with fresh seasoned tilapia and shito."
          multiline
          numberOfLines={3}
        />

        <View style={modalStyles.timeRow}>
          <Field
            label={`Price (${currency})`}
            value={priceStr}
            onChangeText={setPriceStr}
            placeholder="75.00"
            keyboardType="decimal-pad"
            style={{ flex: 1 }}
          />
          <Field
            label="Calories (kcal, optional)"
            value={calories}
            onChangeText={setCalories}
            placeholder="e.g. 520"
            keyboardType="number-pad"
            style={{ flex: 1 }}
          />
        </View>

        <View style={modalStyles.switchRow}>
          <View style={modalStyles.switchText}>
            <Text variant="body-strong">Available on menu</Text>
            <Text variant="caption" style={{ color: theme.meta }}>
              Toggle off when sold out (86) to immediately hide from guest ordering.
            </Text>
          </View>
          <Toggle value={available} onChange={() => setAvailable(!available)} label="Available" />
        </View>

        {/* Dietary labels */}
        <View style={modalStyles.tagGroup}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
            DIETARY LABELS
          </Text>
          <View style={modalStyles.chipsGrid}>
            {DIET_TAGS.map((diet) => {
              const active = dietary.includes(diet);
              return (
                <Pressable
                  key={diet}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() =>
                    setDietary(
                      active ? dietary.filter((d) => d !== diet) : [...dietary, diet]
                    )
                  }
                  style={[
                    modalStyles.tagBtn,
                    {
                      borderColor: active ? theme.fill : theme.line,
                      backgroundColor: active ? theme.fill : theme.white,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? theme.white : theme.text,
                      fontWeight: '600',
                    }}
                  >
                    {t(`dietary.${diet}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Allergens 14 Standard Multi-select */}
        <View style={modalStyles.tagGroup}>
          <Text variant="caption" style={{ color: theme.meta, fontWeight: '700' }}>
            ALLERGENS (STANDARD 14 FOOD SAFETY)
          </Text>
          <View style={modalStyles.chipsGrid}>
            {STANDARD_ALLERGENS.map((allergen) => {
              const active = allergens.includes(allergen);
              return (
                <Pressable
                  key={allergen}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active }}
                  onPress={() =>
                    setAllergens(
                      active ? allergens.filter((a) => a !== allergen) : [...allergens, allergen]
                    )
                  }
                  style={[
                    modalStyles.tagBtn,
                    {
                      borderColor: active ? '#D97706' : theme.line,
                      backgroundColor: active ? '#FEF3C7' : theme.white,
                    },
                  ]}
                >
                  <Text
                    variant="caption"
                    style={{
                      color: active ? '#92400E' : theme.text,
                      fontWeight: active ? '700' : '500',
                    }}
                  >
                    {allergen.replace('_', ' ')}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Modifier Groups Section */}
        <View style={[modalStyles.sectionCard, { borderColor: theme.line }]}>
          <View style={modalStyles.sectionHeader}>
            <View>
              <Text variant="body-strong">Modifier Groups</Text>
              <Text variant="caption" style={{ color: theme.meta }}>
                Sides, toppings, spice level, or size options.
              </Text>
            </View>
            <Button
              label="Add group"
              tone="secondary"
              onPress={addModifierGroup}
            />
          </View>

          {modifierGroups.map((group, gIdx) => (
            <View key={group.id ?? gIdx} style={[modalStyles.modGroupCard, { borderColor: theme.line, backgroundColor: theme.wash }]}>
              <View style={modalStyles.modGroupHeader}>
                <TextInput
                  value={group.name.en}
                  onChangeText={(val) => {
                    const next = [...modifierGroups];
                    next[gIdx] = { ...group, name: { en: val } };
                    setModifierGroups(next);
                  }}
                  placeholder="Group Name (e.g. Choose Spice Level)"
                  placeholderTextColor={theme.meta}
                  style={[modalStyles.modGroupNameInput, { color: theme.text }]}
                />
                <Pressable
                  accessibilityRole="button"
                  onPress={() => removeModifierGroup(gIdx)}
                  style={modalStyles.modDeleteBtn}
                >
                  <Trash2 size={16} color="#DC2626" />
                </Pressable>
              </View>

              <View style={modalStyles.minMaxRow}>
                <Text variant="caption" style={{ color: theme.meta }}>
                  Min choices:
                </Text>
                <TextInput
                  value={String(group.min)}
                  onChangeText={(val) => {
                    const n = parseInt(val, 10);
                    const next = [...modifierGroups];
                    next[gIdx] = { ...group, min: isNaN(n) ? 0 : n };
                    setModifierGroups(next);
                  }}
                  keyboardType="number-pad"
                  style={[modalStyles.miniInput, { color: theme.text, borderColor: theme.line }]}
                />
                <Text variant="caption" style={{ color: theme.meta, marginLeft: 8 }}>
                  Max choices:
                </Text>
                <TextInput
                  value={String(group.max)}
                  onChangeText={(val) => {
                    const n = parseInt(val, 10);
                    const next = [...modifierGroups];
                    next[gIdx] = { ...group, max: isNaN(n) ? 1 : n };
                    setModifierGroups(next);
                  }}
                  keyboardType="number-pad"
                  style={[modalStyles.miniInput, { color: theme.text, borderColor: theme.line }]}
                />
              </View>

              {/* Options in group */}
              <View style={modalStyles.optionsList}>
                {(group.options ?? []).map((opt, oIdx) => (
                  <View key={opt.id ?? oIdx} style={modalStyles.optionItemRow}>
                    <TextInput
                      value={opt.name.en}
                      onChangeText={(val) => {
                        const next = [...modifierGroups];
                        const g = { ...group };
                        const opts = [...g.options];
                        opts[oIdx] = { ...opt, name: { en: val } };
                        g.options = opts;
                        next[gIdx] = g;
                        setModifierGroups(next);
                      }}
                      placeholder="Option name (e.g. Extra Jollof)"
                      placeholderTextColor={theme.meta}
                      style={[modalStyles.optNameInput, { color: theme.text, borderColor: theme.line }]}
                    />
                    <TextInput
                      value={String(opt.pricePesewas / 100)}
                      onChangeText={(val) => {
                        const p = parseMoneyInput(val);
                        const next = [...modifierGroups];
                        const g = { ...group };
                        const opts = [...g.options];
                        opts[oIdx] = { ...opt, pricePesewas: (p ?? 0) as any };
                        g.options = opts;
                        next[gIdx] = g;
                        setModifierGroups(next);
                      }}
                      placeholder="+0.00"
                      keyboardType="decimal-pad"
                      placeholderTextColor={theme.meta}
                      style={[modalStyles.optPriceInput, { color: theme.text, borderColor: theme.line }]}
                    />
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        const next = [...modifierGroups];
                        const g = { ...group };
                        g.options = g.options.filter((_, i) => i !== oIdx);
                        next[gIdx] = g;
                        setModifierGroups(next);
                      }}
                      style={modalStyles.optDeleteBtn}
                    >
                      <X size={14} color="#DC2626" />
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  accessibilityRole="button"
                  onPress={() => addOptionToGroup(gIdx)}
                  style={modalStyles.addOptLink}
                >
                  <Plus size={14} color={theme.fill} />
                  <Text variant="caption" style={{ color: theme.fill, fontWeight: '700' }}>
                    Add option
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        <View style={modalStyles.footerBtns}>
          <Button
            label="Save dish"
            tone="primary"
            onPress={() => saveMutation.mutate()}
            loading={saveMutation.isPending}
            disabled={!name.trim() || !priceStr.trim() || !categoryId}
          />
        </View>
      </View>
    </ModalSheet>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  topActionsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E4E4E7',
    borderRadius: tokens.radius.full,
    paddingHorizontal: tokens.space[3],
    height: 44,
    gap: tokens.space[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400',
  },
  buttonsGroup: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  categoryBar: {
    marginTop: tokens.space[1],
  },
  catToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.md,
    borderWidth: 1,
    gap: tokens.space[2],
  },
  catToolbarInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  scheduleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  catToolbarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
  },
  actionIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 6,
  },
  bulkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: tokens.space[2],
  },
  bulkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  itemsList: { gap: tokens.space[3] },
  itemCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  itemInfo: {
    flex: 1,
    gap: tokens.space[1],
  },
  nameHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  itemName: {
    fontSize: 18,
    lineHeight: 24,
  },
  catPill: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#71717A',
  },
  itemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: tokens.space[2],
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
  },
  modPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[1],
    marginTop: 4,
  },
  dietPill: {
    backgroundColor: '#F4F4F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  dietPillText: {
    fontSize: 11,
    fontFamily: 'Inter_600',
  },
  allergenPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: tokens.radius.full,
  },
  itemControls: {
    alignItems: 'flex-end',
    gap: tokens.space[2],
  },
  toggleCol: {
    alignItems: 'center',
    gap: 4,
  },
  cardActionsCol: {
    flexDirection: 'row',
    gap: tokens.space[1],
    marginTop: 4,
  },
  smallIconBtn: {
    width: 32,
    height: 32,
    borderRadius: tokens.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const modalStyles = StyleSheet.create({
  formStack: {
    gap: tokens.space[4],
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  switchText: {
    flex: 1,
    gap: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scheduleFields: {
    gap: tokens.space[3],
    paddingTop: tokens.space[2],
  },
  daysRow: {
    flexDirection: 'row',
    gap: tokens.space[1],
    flexWrap: 'wrap',
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
  },
  footerBtns: {
    paddingTop: tokens.space[2],
  },
  catSelectWrap: {
    gap: tokens.space[2],
  },
  catScroll: {
    flexDirection: 'row',
  },
  catRadioBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  tagGroup: {
    gap: tokens.space[2],
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  tagBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
  },
  modGroupCard: {
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    padding: tokens.space[3],
    gap: tokens.space[2],
  },
  modGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  modGroupNameInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_600',
    paddingVertical: 4,
  },
  modDeleteBtn: {
    padding: 6,
  },
  minMaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniInput: {
    width: 48,
    height: 32,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#FFFFFF',
    textAlign: 'center',
    fontSize: 13,
  },
  optionsList: {
    gap: tokens.space[2],
    marginTop: 4,
  },
  optionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
  },
  optNameInput: {
    flex: 2,
    height: 36,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    fontSize: 13,
  },
  optPriceInput: {
    width: 72,
    height: 36,
    borderWidth: 1,
    borderRadius: tokens.radius.sm,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    fontSize: 13,
    textAlign: 'right',
  },
  optDeleteBtn: {
    padding: 6,
  },
  addOptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
});
