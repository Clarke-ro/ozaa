import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cartCount, cartEstimate, useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';
import { DietFilterSheet } from './DietFilterSheet';
import { filterMenuItems, type DietTag } from './filterMenu';

export function MenuScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const lines = useCart((state) => state.lines);
  const [kind, setKind] = useState<'food' | 'drinks'>('food');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [diets, setDiets] = useState<DietTag[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState(false);

  const categories = useMemo(
    () => (menu.data?.categories ?? []).filter((category) => category.kind === kind),
    [menu.data, kind],
  );
  const active =
    categoryId && categories.some((category) => category.id === categoryId)
      ? categoryId
      : categories[0]?.id;
  const items = filterMenuItems(menu.data?.items ?? [], active, diets);

  if (menu.isLoading) return <LoadingState />;
  if (menu.isError || !menu.data) return <ErrorState onRetry={() => void menu.refetch()} />;

  return (
    <SafeScreen>
      <PageHeader
        title={t('menu.title')}
        subtitle={venue.data?.name ?? ''}
        right={
          <View style={styles.headerActions}>
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  diets.length > 0
                    ? t('menu.filtersOn', { count: diets.length })
                    : t('menu.filters')
                }
                onPress={() => setFiltersOpen(true)}
                style={styles.headerIcon}
              >
                <SlidersHorizontal color={theme.black} size={22} strokeWidth={2} />
              </Pressable>
              {diets.length > 0 ? (
                <View
                  pointerEvents="none"
                  style={[styles.count, { backgroundColor: tokens.color.primary.hex }]}
                >
                  <Text variant="caption" style={styles.countText}>
                    {diets.length}
                  </Text>
                </View>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.search')}
              onPress={() => setSearch((value) => !value)}
              style={styles.headerIcon}
            >
              <Search color={theme.black} size={22} strokeWidth={2} />
            </Pressable>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={styles.tabs}>
          {(['food', 'drinks'] as const).map((tab) => (
            <Pressable key={tab} accessibilityRole="tab" onPress={() => setKind(tab)}>
              <Text
                variant="body-strong"
                style={{ color: kind === tab ? theme.black : theme.meta }}
              >
                {t(`menu.${tab}`)}
              </Text>
              {kind === tab ? (
                <View style={[styles.underline, { backgroundColor: theme.black }]} />
              ) : null}
            </Pressable>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {categories.map((category) => {
            const on = category.id === active;
            return (
              <Pressable
                key={category.id}
                accessibilityRole="button"
                onPress={() => setCategoryId(category.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: on ? theme.fill : theme.white,
                    borderColor: on ? theme.fill : theme.line,
                  },
                ]}
              >
                <Text
                  variant="caption"
                  style={{ color: on ? theme.onFill : theme.text, fontFamily: 'Inter_600' }}
                >
                  {category.name.en}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Text variant="display-m" style={styles.section}>
          {categories.find((category) => category.id === active)?.name.en}
        </Text>
        {items.length === 0 ? (
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {diets.length > 0 ? t('menu.noMatch') : t('menu.empty')}
          </Text>
        ) : null}
        {search ? (
          <Text variant="caption" style={styles.section}>
            {t('menu.search')}
          </Text>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={item.name.en}
            onPress={() => router.push(`/${slug}/menu/${item.id}`)}
            style={styles.item}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={styles.nameRow}>
                <Text variant="body-strong">{item.name.en}</Text>
                {item.badges.includes('popular') ? (
                  <Text
                    variant="caption"
                    style={[styles.badge, { color: theme.badgeInk, backgroundColor: theme.tint }]}
                  >
                    {t('menu.popular')}
                  </Text>
                ) : null}
              </View>
              <Text variant="caption" style={{ color: theme.muted, marginTop: 4 }}>
                {item.description.en}
              </Text>
              <View style={{ marginTop: 8 }}>
                {item.available ? (
                  <PriceText amount={item.pricePesewas} currency={venue.data?.currency} />
                ) : (
                  <Text style={{ color: theme.error }}>{t('menu.soldOut')}</Text>
                )}
              </View>
            </View>
            <View>
              {item.photo ? (
                <VenueImage
                  url={item.photo.url}
                  alt={item.photo.alt ?? item.name.en}
                  style={styles.photo}
                />
              ) : (
                <View style={[styles.photo, { backgroundColor: theme.wash }]} />
              )}
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
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(`/${slug}/order`)}
          style={[styles.bar, { backgroundColor: theme.fill }]}
        >
          <Text variant="button" style={{ color: theme.onFill }}>
            {cartCount(lines)} {t('menu.viewOrder')}
          </Text>
          <Text variant="button" style={{ color: theme.onFill, fontVariant: ['tabular-nums'] }}>
            {formatMoney(cartEstimate(lines), venue.data?.currency ?? DEFAULT_CURRENCY)}
          </Text>
        </Pressable>
      ) : null}
      {filtersOpen ? (
        <DietFilterSheet
          selected={diets}
          onApply={(tags) => {
            setDiets(tags);
            setFiltersOpen(false);
          }}
          onClear={() => {
            setDiets([]);
            setFiltersOpen(false);
          }}
          onClose={() => setFiltersOpen(false)}
        />
      ) : null}
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  count: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { color: tokens.color.white.hex, fontSize: 11, lineHeight: 13 },
  tabs: { flexDirection: 'row', gap: 20, paddingHorizontal: 20, paddingTop: 16 },
  underline: { height: 2, marginTop: 6 },
  chips: { paddingHorizontal: 20, gap: 8, paddingTop: 14 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { paddingHorizontal: 20, marginTop: 18, marginBottom: 8 },
  empty: { paddingHorizontal: 20, paddingTop: 28, textAlign: 'center' },
  item: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { overflow: 'hidden', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  photo: { width: 92, height: 92, borderRadius: 12 },
  plus: {
    position: 'absolute',
    right: -6,
    bottom: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 16,
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
