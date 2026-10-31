import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
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

const DIET = ['vegetarian', 'vegan', 'gluten_free', 'halal', 'spicy'] as const;

export function MenuDeskScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const client = useQueryClient();
  const venue = useQuery({ queryKey: ['owner-venue', venueId], queryFn: () => api.ownerGetVenue(venueId), enabled: Boolean(venueId) });
  const slug = venue.data?.slug ?? '';
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug), enabled: Boolean(slug) });
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [kind, setKind] = useState<'food' | 'drinks'>('food');
  const [openId, setOpenId] = useState<string | null>(null);
  const refresh = () => void client.invalidateQueries({ queryKey: ['menu', slug] });
  const toggle = useMutation({
    mutationFn: (item: MenuItem) => api.ownerUpdateItem(venueId, item.id, { available: !item.available }),
    onSuccess: refresh,
  });
  const tag = useMutation({
    mutationFn: (input: { item: MenuItem; dietary: MenuItem['dietary'] }) => api.ownerUpdateItem(venueId, input.item.id, { dietary: input.dietary }),
    onSuccess: refresh,
  });
  const add = useMutation({
    mutationFn: () => {
      const amount = parseMoneyInput(price);
      const category = (menu.data?.categories ?? []).find((item) => item.kind === kind);
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

  return (
    <OwnerPage title={t('owner.menu')}>
      <DeskWait loading={menu.isLoading || venue.isLoading} error={menu.isError || venue.isError} onRetry={() => void menu.refetch()}>
        <View style={styles.kinds}>
          {(['food', 'drinks'] as const).map((value) => (
            <Pressable key={value} accessibilityRole="button" onPress={() => setKind(value)} style={[styles.kind, { borderColor: kind === value ? theme.black : theme.line }]}>
              <Text>{t(`menu.${value}`)}</Text>
            </Pressable>
          ))}
        </View>
        {(menu.data?.items ?? [])
          .filter((item) => (menu.data?.categories ?? []).find((category) => category.id === item.categoryId)?.kind === kind)
          .map((item) => (
            <View key={item.id} style={[styles.row, { borderColor: theme.line }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Pressable accessibilityRole="button" onPress={() => setOpenId(openId === item.id ? null : item.id)}>
                  <Text variant="body-strong">{item.name.en}</Text>
                </Pressable>
                <Text variant="caption" style={{ fontVariant: ['tabular-nums'] }}>
                  {formatMoney(pesewas(item.pricePesewas), venue.data?.currency ?? 'GHS')}
                </Text>
                {openId === item.id ? (
                  <View style={styles.tags}>
                    {DIET.map((diet) => {
                      const on = item.dietary.includes(diet);
                      return (
                        <Pressable
                          key={diet}
                          accessibilityRole="switch"
                          accessibilityState={{ checked: on }}
                          onPress={() =>
                            tag.mutate({
                              item,
                              dietary: on ? item.dietary.filter((value) => value !== diet) : [...item.dietary, diet],
                            })
                          }
                        >
                          <Text variant="caption" style={{ color: on ? theme.fill : theme.meta }}>
                            {t(`dietary.${diet}`)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
              <Pressable accessibilityRole="switch" accessibilityState={{ checked: item.available }} onPress={() => toggle.mutate(item)} style={styles.switch}>
                <Text variant="caption" style={{ color: item.available ? theme.text : theme.fill }}>
                  {item.available ? t('owner.onMenu') : t('owner.soldOut')}
                </Text>
              </Pressable>
            </View>
          ))}
        <TextInput accessibilityLabel={t('owner.dishName')} value={name} onChangeText={setName} placeholder={t('owner.dishName')} style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <TextInput accessibilityLabel={t('owner.price')} value={price} onChangeText={setPrice} placeholder={t('owner.price')} keyboardType="decimal-pad" style={[styles.input, { borderColor: theme.line, color: theme.text }]} />
        <Button label={t('owner.addDish')} onPress={() => add.mutate()} loading={add.isPending} />
      </DeskWait>
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  kinds: { flexDirection: 'row', gap: tokens.space[2] },
  kind: { minHeight: 44, paddingHorizontal: tokens.space[4], borderWidth: 1, borderRadius: tokens.radius.full, justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], borderBottomWidth: 1, paddingVertical: tokens.space[3] },
  switch: { minHeight: 44, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: tokens.radius.md, minHeight: 48, paddingHorizontal: tokens.space[3] },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
});
