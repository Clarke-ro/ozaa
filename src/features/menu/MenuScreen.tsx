import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { MenuItem } from '@/lib/api/types';
import { cartCount, cartEstimate, useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { formatCedis } from '@/lib/money';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';

const DIET = ['vegetarian', 'vegan', 'gluten_free', 'halal'] as const;

export function MenuScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const lines = useCart((state) => state.lines);
  const [kind, setKind] = useState<'food' | 'drinks'>('food');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [diet, setDiet] = useState<string | null>(null);
  const [search, setSearch] = useState(false);

  const categories = useMemo(
    () => (menu.data?.categories ?? []).filter((category) => category.kind === kind),
    [menu.data, kind],
  );
  const active = categoryId && categories.some((category) => category.id === categoryId) ? categoryId : categories[0]?.id;
  const items = (menu.data?.items ?? []).filter((item) => {
    if (item.categoryId !== active) return false;
    if (diet && !item.dietary.includes(diet as MenuItem['dietary'][number])) return false;
    return true;
  });

  if (menu.isLoading) return <LoadingState />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => void menu.refetch()} />;

  return (
    <SafeScreen>
      <PageHeader
        title={t('menu.title')}
        subtitle={venue.data?.name ?? ''}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel={t('menu.search')} onPress={() => setSearch((value) => !value)}>
            <Search color={theme.black} size={22} />
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.tabs}>
          {(['food', 'drinks'] as const).map((tab) => (
            <Pressable key={tab} accessibilityRole="tab" onPress={() => setKind(tab)}>
              <Text variant="body-strong" style={{ color: kind === tab ? theme.black : theme.meta }}>
                {t(`menu.${tab}`)}
              </Text>
              {kind === tab ? <View style={[styles.underline, { backgroundColor: theme.black }]} /> : null}
            </Pressable>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((category) => {
            const on = category.id === active;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() => setCategoryId(category.id)}
                style={[styles.chip, { backgroundColor: on ? theme.fill : theme.white, borderColor: on ? theme.fill : theme.line }]}
              >
                <Text variant="caption" style={{ color: on ? theme.onFill : theme.text, fontFamily: 'Inter_600' }}>
                  {category.name.en}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Text variant="caption" style={{ color: theme.muted, alignSelf: 'center' }}>
            {t('menu.showOnly')}
          </Text>
          {DIET.map((tag) => {
            const on = diet === tag;
            return (
              <Pressable key={tag} accessibilityRole="button" onPress={() => setDiet(on ? null : tag)} style={[styles.chip, { borderColor: theme.line, backgroundColor: on ? theme.tint : theme.white }]}>
                <Text variant="caption">{t(`dietary.${tag}`)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text variant="display-m" style={styles.section}>
          {categories.find((category) => category.id === active)?.name.en}
        </Text>
        {items.length === 0 ? <Text style={styles.section}>{t('menu.empty')}</Text> : null}
        {search ? <Text variant="caption" style={styles.section}>{t('menu.search')}</Text> : null}
        {items.map((item) => (
          <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.name.en} onPress={() => router.push(`/${slug}/menu/${item.id}`)} style={styles.item}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.nameRow}>
                <Text variant="body-strong">{item.name.en}</Text>
                {item.badges.includes('popular') ? (
                  <Text variant="caption" style={[styles.badge, { color: theme.badgeInk, backgroundColor: theme.tint }]}>
                    {t('menu.popular')}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" style={{ color: theme.muted, marginTop: 4 }}>
                {item.description.en}
              </Text>
              <View style={{ marginTop: 8 }}>
                {item.available ? <PriceText amount={item.pricePesewas} /> : <Text style={{ color: theme.error }}>{t('menu.soldOut')}</Text>}
              </View>
            </View>
            <View>
              {item.photo ? <VenueImage url={item.photo.url} alt={item.photo.alt ?? item.name.en} style={styles.photo} /> : <View style={[styles.photo, { backgroundColor: theme.wash }]} />}
              {item.available ? (
                <View style={[styles.plus, { backgroundColor: theme.fill }]}>
                  <Plus color={theme.onFill} size={16} strokeWidth={2.5} />
                </View>
              ) : null}
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {cartCount(lines) > 0 ? (
        <Pressable accessibilityRole="button" onPress={() => router.push(`/${slug}/order`)} style={[styles.bar, { backgroundColor: theme.fill }]}>
          <Text variant="button" style={{ color: theme.onFill }}>
            {cartCount(lines)}  {t('menu.viewOrder')}
          </Text>
          <Text variant="button" style={{ color: theme.onFill, fontVariant: ['tabular-nums'] }}>
            {formatCedis(cartEstimate(lines))}
          </Text>
        </Pressable>
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingTop: 16 },
  underline: { height: 2, marginTop: 6 },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 14 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  section: { paddingHorizontal: 20, marginTop: 18, marginBottom: 8 },
  item: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  photo: { width: 92, height: 92, borderRadius: 12 },
  plus: { position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', left: 20, right: 20, bottom: 16, height: 52, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
