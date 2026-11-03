import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Clock, Flame, Minus, Plus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { hapticImpactLight, hapticSelection } from '@/lib/haptics';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { ErrorState, LoadingState } from '@/ui/states';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { addOnTotal, missingChoice, pickOption } from './dishLogic';
import { DishGallery } from './DishGallery';
import { guestKeys } from '@/lib/queryKeys';

/** One dish: swipeable photos, what is in it, the venue's add-on choices, and Add with the full price. */
export function ItemScreen({ slug, itemId }: { slug: string; itemId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const add = useCart((state) => state.add);
  const menu = useQuery({ queryKey: guestKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [showMissing, setShowMissing] = useState(false);
  const item = menu.data?.items.find((candidate) => candidate.id === itemId);

  if (menu.isLoading) return <LoadingState />;
  if (!item) return <ErrorState onRetry={() => router.back()} />;

  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const extra = addOnTotal(item.modifierGroups, picks);
  const total = (item.pricePesewas + extra) * quantity;
  const missing = missingChoice(item.modifierGroups, picks);
  const related = (menu.data?.items ?? [])
    .filter((i) => i.categoryId === item.categoryId && i.id !== item.id && i.available)
    .slice(0, 6);
  const facts = [
    item.prepMinutes ? { icon: Clock, text: t('menu.prep', { count: item.prepMinutes }) } : null,
    item.calories ? { icon: Flame, text: t('menu.kcal', { count: item.calories }) } : null,
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  const submit = () => {
    if (missing) {
      setShowMissing(true);
      return;
    }
    void hapticImpactLight();
    add(slug, {
      menuItemId: item.id,
      name: item.name.en,
      quantity,
      unitPricePesewas: pesewas(item.pricePesewas),
      modifierPesewas: pesewas(extra),
      modifierOptionIds: Object.values(picks).flat(),
      note: note.trim() || undefined,
    });
    router.back();
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.white }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View
          style={[styles.hero, { backgroundColor: theme.wash, paddingTop: insets.top + HERO_TOP }]}
        >
          <DishGallery
            photos={item.photo ? [item.photo, ...(item.gallery ?? [])] : []}
            name={item.name.en}
          />
        </View>
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text variant="display-m" style={styles.flex}>
              {item.name.en}
            </Text>
            <Text variant="title" style={styles.num}>
              {money(item.pricePesewas)}
            </Text>
          </View>
          {item.description.en ? (
            <Text variant="body" style={{ color: theme.muted }}>
              {item.description.en}
            </Text>
          ) : null}
          {facts.length || item.dietary.length || item.dietaryCustom?.length ? (
            <View style={styles.chips}>
              {facts.map((f) => (
                <View key={f.text} style={[styles.chip, { borderColor: theme.line }]}>
                  <f.icon size={14} color={theme.muted} />
                  <Text variant="caption">{f.text}</Text>
                </View>
              ))}
              {item.dietary.map((d) => (
                <View key={d} style={[styles.chip, { borderColor: theme.line }]}>
                  <Text variant="caption">{t(`dietary.${d}`)}</Text>
                </View>
              ))}
              {(item.dietaryCustom ?? []).map((d) => (
                <View key={d} style={[styles.chip, { borderColor: theme.line }]}>
                  <Text variant="caption">{d}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {item.allergens?.length ? (
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('menu.contains', {
                list: item.allergens
                  // Standard allergens have names; ones the owner typed show as written.
                  .map((a) => t(`ownerMenu.allergen.${a}`, { defaultValue: a }))
                  .join(', '),
              })}
            </Text>
          ) : null}

          {item.modifierGroups.map((group) => {
            const picked = picks[group.id] ?? [];
            const needed = showMissing && missing?.id === group.id;
            return (
              <View key={group.id} style={styles.group}>
                <View style={styles.groupHead}>
                  <Text variant="title" style={styles.flex}>
                    {group.name.en}
                  </Text>
                  <Text
                    variant="caption"
                    style={{ color: needed ? theme.error : theme.muted, fontFamily: 'Inter_600' }}
                  >
                    {group.min > 0
                      ? t('menu.required')
                      : group.max > 1
                        ? t('menu.upTo', { count: group.max })
                        : t('menu.optional')}
                  </Text>
                </View>
                {group.options.map((option) => {
                  const on = picked.includes(option.id);
                  return (
                    <Pressable
                      key={option.id}
                      accessibilityRole={group.max === 1 ? 'radio' : 'checkbox'}
                      accessibilityState={{ checked: on }}
                      onPress={() => {
                        void hapticSelection();
                        setPicks((p) => ({
                          ...p,
                          [group.id]: pickOption(group, picked, option.id),
                        }));
                      }}
                      style={[
                        styles.option,
                        {
                          borderColor: on ? theme.fill : theme.line,
                          backgroundColor: on ? theme.tint : theme.white,
                        },
                      ]}
                    >
                      <View
                        style={[
                          group.max === 1 ? styles.radio : styles.box,
                          {
                            borderColor: on ? theme.fill : theme.line,
                            backgroundColor: on ? theme.fill : 'transparent',
                          },
                        ]}
                      >
                        {on ? <Check size={14} color={theme.onFill} strokeWidth={3} /> : null}
                      </View>
                      <Text variant="body" style={styles.flex}>
                        {option.name.en}
                      </Text>
                      {option.pricePesewas ? (
                        <Text variant="caption" style={{ color: theme.muted }}>
                          +{money(option.pricePesewas)}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}

          <View style={styles.qtyRow}>
            <Text variant="title" style={styles.flex}>
              {t('menu.quantity')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.less')}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              style={[styles.step, { backgroundColor: theme.wash }]}
            >
              <Minus size={18} color={theme.text} />
            </Pressable>
            <Text variant="title" style={styles.qty}>
              {quantity}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.more')}
              onPress={() => setQuantity((q) => Math.min(50, q + 1))}
              style={[styles.step, { backgroundColor: theme.wash }]}
            >
              <Plus size={18} color={theme.text} />
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel={t('menu.note')}
            placeholder={t('menu.note')}
            placeholderTextColor={theme.meta}
            value={note}
            onChangeText={setNote}
            maxLength={140}
            style={[styles.note, { borderColor: theme.line, color: theme.text }]}
          />

          {related.length ? (
            <View style={styles.group}>
              <Text variant="title">{t('menu.alsoLike')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.related}
              >
                {related.map((r) => (
                  <Pressable
                    key={r.id}
                    accessibilityRole="button"
                    accessibilityLabel={r.name.en}
                    onPress={() => router.replace(`/${slug}/menu/${r.id}`)}
                    style={[styles.mini, { borderColor: theme.line }]}
                  >
                    <View style={[styles.miniPhoto, { backgroundColor: theme.wash }]}>
                      {r.photo ? (
                        <VenueImage url={r.photo.url} alt="" style={StyleSheet.absoluteFill} />
                      ) : null}
                    </View>
                    <Text variant="caption" numberOfLines={1} style={styles.miniText}>
                      {r.name.en}
                    </Text>
                    <Text variant="caption" style={[styles.miniText, { color: theme.muted }]}>
                      {money(r.pricePesewas)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={() => router.back()}
        style={[styles.back, { top: insets.top + 8, backgroundColor: theme.white }]}
      >
        <ArrowLeft size={22} color={theme.black} />
      </Pressable>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: Math.max(insets.bottom, 12),
            backgroundColor: theme.white,
            borderTopColor: theme.line,
          },
        ]}
      >
        {showMissing && missing ? (
          <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
            {t('menu.choose', { group: missing.name.en })}
          </Text>
        ) : null}
        <Button
          label={item.available ? t('menu.add', { price: money(total) }) : t('menu.soldOut')}
          disabled={!item.available}
          onPress={submit}
        />
      </View>
    </View>
  );
}

// Space for the back button above the photo.
const HERO_TOP = 56;
const MINI = 132;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // The soft panel behind the photo, with rounded bottom corners (the original look).
  hero: {
    alignSelf: 'stretch',
    paddingHorizontal: tokens.space[5],
    paddingBottom: tokens.space[4],
    borderBottomLeftRadius: tokens.radius.xl + 4,
    borderBottomRightRadius: tokens.radius.xl + 4,
  },
  body: { padding: 20, gap: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    minHeight: 32,
  },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 14,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  step: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  qty: { minWidth: 28, textAlign: 'center', fontVariant: ['tabular-nums'] },
  note: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter_400',
  },
  related: { gap: 12 },
  mini: {
    width: MINI,
    borderWidth: 1,
    borderRadius: tokens.radius.md + 2,
    overflow: 'hidden',
    paddingBottom: tokens.space[2],
  },
  // Square, like the dish photos themselves, so nothing is cut off.
  miniPhoto: { width: MINI, aspectRatio: 1 },
  miniText: { paddingHorizontal: 8, paddingTop: 4 },
  back: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
