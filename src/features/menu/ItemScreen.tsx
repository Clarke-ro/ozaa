import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, Flame, Minus, Plus } from 'lucide-react-native';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { isOnGuestMenu, quantityLimits, unitPrice } from '@/lib/dishRules';
import { hapticImpactLight } from '@/lib/haptics';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { ErrorState, LoadingState } from '@/ui/states';
import { tokens } from '@/theme/tokens';
import { useTheme } from '@/ui/theme';
import { addOnTotal, missingChoice } from '@/lib/dishLogic';
import { DishPrice } from './DishPrice';
import { DishChoices } from './DishChoices';
import { DishGallery } from './DishGallery';
import { RelatedDishes } from './RelatedDishes';
import { guestKeys } from '@/lib/queryKeys';
import { SHADOW_INK } from '@/theme/palette';
import { canOrderHere, useAtTable } from '@/features/session';

/** One dish: swipeable photos, what is in it, the venue's add-on choices, and Add with the full price. */
export function ItemScreen({ slug, itemId }: { slug: string; itemId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const add = useCart((state) => state.add);
  const atTable = useAtTable(slug);
  const menu = useQuery({ queryKey: guestKeys.menu(slug), queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  // Browse only from the venue link when the venue takes no online orders.
  const canOrder = canOrderHere(atTable, venue.data);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [showMissing, setShowMissing] = useState(false);
  const item = menu.data?.items.find((candidate) => candidate.id === itemId);

  if (menu.isLoading) return <LoadingState />;
  if (!item || !isOnGuestMenu(item)) return <ErrorState onRetry={() => router.back()} />;

  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const extra = addOnTotal(item.modifierGroups, picks);
  const limits = quantityLimits(item);
  // Keep the count inside the owner's limits, even if stock dropped while the page was open.
  const count = Math.min(limits.max, Math.max(limits.min, quantity));
  const total = (unitPrice(item) + extra) * count;
  const missing = missingChoice(item.modifierGroups, picks);
  const related = (menu.data?.items ?? [])
    .filter(
      (i) =>
        i.categoryId === item.categoryId && i.id !== item.id && i.available && isOnGuestMenu(i),
    )
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
      quantity: count,
      unitPricePesewas: pesewas(unitPrice(item)),
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
            <View>
              <DishPrice item={item} currency={currency} size="title" />
            </View>
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

          <DishChoices
            groups={item.modifierGroups}
            picks={picks}
            onPick={(groupId, ids) => setPicks((p) => ({ ...p, [groupId]: ids }))}
            missingId={showMissing ? (missing?.id ?? null) : null}
            money={money}
          />

          <View style={styles.qtyRow}>
            <Text variant="title" style={styles.flex}>
              {t('menu.quantity')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.less')}
              aria-disabled={count <= limits.min}
              disabled={count <= limits.min}
              onPress={() => setQuantity(Math.max(limits.min, count - 1))}
              style={[
                styles.step,
                { backgroundColor: theme.wash },
                count <= limits.min && styles.off,
              ]}
            >
              <Minus size={18} color={theme.text} />
            </Pressable>
            <Text variant="title" style={styles.qty}>
              {count}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('menu.more')}
              aria-disabled={count >= limits.max}
              disabled={count >= limits.max}
              onPress={() => setQuantity(Math.min(limits.max, count + 1))}
              style={[
                styles.step,
                { backgroundColor: theme.wash },
                count >= limits.max && styles.off,
              ]}
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

          <RelatedDishes
            dishes={related}
            money={money}
            onOpen={(id) => router.replace(`/${slug}/menu/${id}`)}
          />
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

      {canOrder ? (
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
      ) : null}
    </View>
  );
}

// Space for the back button above the photo.
const HERO_TOP = 56;

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
  // A stepper at its limit fades, so it doesn't look tappable.
  off: { opacity: 0.4 },
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
  back: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SHADOW_INK,
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
