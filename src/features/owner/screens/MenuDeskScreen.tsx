import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuItem } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney, parseMoneyInput } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { useOwnerSession } from '@/features/session';
import { DeskWait, OwnerPage } from '../chrome/OwnerPage';
import { ChipRow, DeskCard, DeskTabs, Field, SectionLabel, Toggle } from '../kit';

const DIET = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy'] as const;

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
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = () => void client.invalidateQueries({ queryKey: ['menu', slug] });

  const toggle = useMutation({
    mutationFn: (item: MenuItem) =>
      api.ownerUpdateItem(venueId, item.id, { available: !item.available }),
    onSuccess: refresh,
  });

  const tag = useMutation({
    mutationFn: (input: { item: MenuItem; dietary: MenuItem['dietary'] }) =>
      api.ownerUpdateItem(venueId, input.item.id, { dietary: input.dietary }),
    onSuccess: refresh,
  });

  const add = useMutation({
    mutationFn: () => {
      const amount = parseMoneyInput(price);
      const category = (menu.data?.categories ?? []).find(
        (c) => c.kind === kind && (selectedCat === 'all' || c.id === selectedCat)
      ) ?? (menu.data?.categories ?? []).find((c) => c.kind === kind);

      if (!amount || !category || !name.trim()) throw new Error('missing');
      return api.ownerCreateItem(venueId, {
        categoryId: category.id,
        name: { en: name.trim() },
        description: { en: '' },
        pricePesewas: amount,
        available: true,
        dietary: [],
      });
    },
    onSuccess: () => {
      setName('');
      setPrice('');
      refresh();
    },
  });

  const categories = (menu.data?.categories ?? []).filter((c) => c.kind === kind);
  const allItems = menu.data?.items ?? [];

  const filteredItems = allItems.filter((item) => {
    const itemCat = (menu.data?.categories ?? []).find((c) => c.id === item.categoryId);
    if (!itemCat || itemCat.kind !== kind) return false;
    if (selectedCat !== 'all' && item.categoryId !== selectedCat) return false;
    return true;
  });

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
    { id: 'all', label: 'All categories' },
    ...categories.map((c) => ({ id: c.id, label: c.name.en })),
  ];

  return (
    <OwnerPage
      title={t('owner.menu')}
      subtitle="Manage your dishes, drinks, prices, sold out status, and dietary tags."
    >
      <DeskWait
        loading={menu.isLoading || venue.isLoading}
        error={menu.isError || venue.isError}
        onRetry={() => void menu.refetch()}
      >
        <View style={styles.stack}>
          <DeskTabs tabs={kindTabs} value={kind} onChange={setKind} />

          <ChipRow items={categoryChips} value={selectedCat} onChange={setSelectedCat} />

          {/* Items List */}
          <View style={styles.itemsList}>
            {filteredItems.map((item) => {
              const isOpen = openId === item.id;
              return (
                <DeskCard
                  key={item.id}
                  tone={item.available ? 'plain' : 'wash'}
                  style={styles.itemCard}
                >
                  <View style={styles.itemMainRow}>
                    <View style={styles.itemInfo}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setOpenId(isOpen ? null : item.id)}
                      >
                        <Text
                          variant="title"
                          style={[
                            styles.itemName,
                            !item.available && { color: theme.meta },
                          ]}
                        >
                          {item.name.en}
                        </Text>
                      </Pressable>

                      <Text
                        variant="body-strong"
                        style={[styles.itemPrice, { fontVariant: ['tabular-nums'] }]}
                      >
                        {formatMoney(pesewas(item.pricePesewas), venue.data?.currency ?? 'GHS')}
                      </Text>

                      {item.dietary.length > 0 ? (
                        <View style={styles.dietPillsRow}>
                          {item.dietary.map((d) => (
                            <View key={d} style={styles.dietPill}>
                              <Text variant="caption" style={styles.dietPillText}>
                                {t(`dietary.${d}`)}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}
                    </View>

                    {/* Available / Sold out Toggle Switch */}
                    <View style={styles.toggleCol}>
                      <Toggle
                        value={item.available}
                        onChange={() => toggle.mutate(item)}
                        label={item.name.en}
                        disabled={toggle.isPending}
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
                  </View>

                  {/* Expandable Dietary Tags Configuration */}
                  {isOpen ? (
                    <View style={styles.dietEditSection}>
                      <Text variant="caption" style={{ color: theme.meta }}>
                        Toggle dietary tags for guests:
                      </Text>
                      <View style={styles.tagsGrid}>
                        {DIET.map((diet) => {
                          const on = item.dietary.includes(diet);
                          return (
                            <Pressable
                              key={diet}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: on }}
                              onPress={() =>
                                tag.mutate({
                                  item,
                                  dietary: on
                                    ? item.dietary.filter((value) => value !== diet)
                                    : [...item.dietary, diet],
                                })
                              }
                              style={[
                                styles.dietBtn,
                                {
                                  borderColor: on ? theme.black : theme.line,
                                  backgroundColor: on ? theme.black : theme.white,
                                },
                              ]}
                            >
                              <Text
                                variant="caption"
                                style={{
                                  color: on ? theme.white : theme.text,
                                  fontFamily: 'Inter_600',
                                }}
                              >
                                {t(`dietary.${diet}`)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </DeskCard>
              );
            })}
          </View>

          {/* Add Item Card */}
          <SectionLabel title="Add new item" />
          <DeskCard style={styles.addCard}>
            <View style={styles.inputsRow}>
              <Field
                label={t('owner.dishName')}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Suya spiced chicken"
              />
              <Field
                label={t('owner.price')}
                value={price}
                onChangeText={setPrice}
                placeholder="65.00"
                keyboardType="decimal-pad"
                style={{ width: 120 }}
              />
            </View>
            <Button
              label={t('owner.addDish')}
              onPress={() => add.mutate()}
              loading={add.isPending}
              disabled={!name.trim() || !price.trim()}
            />
          </DeskCard>
        </View>
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[4] },
  itemsList: { gap: tokens.space[3] },
  itemCard: {
    padding: tokens.space[4],
    gap: tokens.space[3],
  },
  itemMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[3],
  },
  itemInfo: {
    flex: 1,
    gap: tokens.space[1],
  },
  itemName: {
    fontSize: 18,
    lineHeight: 24,
  },
  itemPrice: {
    fontSize: 16,
  },
  dietPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[1],
    marginTop: 2,
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
  toggleCol: {
    alignItems: 'center',
    gap: 4,
  },
  dietEditSection: {
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.space[2],
  },
  dietBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCard: {
    gap: tokens.space[3],
    padding: tokens.space[4],
  },
  inputsRow: {
    flexDirection: 'row',
    gap: tokens.space[3],
    flexWrap: 'wrap',
  },
});
