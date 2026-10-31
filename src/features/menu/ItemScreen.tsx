import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { pesewas } from '@/lib/brand';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useCart } from '@/features/cart';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { VenueImage } from '@/ui/VenueImage';
import { ErrorState, LoadingState } from '@/ui/states';
import { useTheme } from '@/ui/theme';

export function ItemScreen({ slug, itemId }: { slug: string; itemId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const add = useCart((state) => state.add);
  const menu = useQuery({ queryKey: ['menu', slug], queryFn: () => api.getMenu(slug) });
  const venue = useVenue(slug);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const item = menu.data?.items.find((candidate) => candidate.id === itemId);

  if (menu.isLoading) return <LoadingState />;
  if (!item) return <ErrorState onRetry={() => router.back()} />;

  const total = item.pricePesewas * quantity;
  return (
    <SafeScreen>
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        {item.photo ? (
          <VenueImage url={item.photo.url} alt={item.name.en} style={styles.photo} />
        ) : null}
        <Text variant="display-m">{item.name.en}</Text>
        <Text variant="body" style={{ color: theme.muted, marginTop: 8 }}>
          {item.description.en}
        </Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Less"
            onPress={() => setQuantity((value) => Math.max(1, value - 1))}
            style={styles.step}
          >
            <Text variant="title">−</Text>
          </Pressable>
          <Text variant="title">{quantity}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More"
            onPress={() => setQuantity((value) => value + 1)}
            style={styles.step}
          >
            <Text variant="title">+</Text>
          </Pressable>
        </View>
        <TextInput
          accessibilityLabel={t('menu.note')}
          placeholder={t('menu.note')}
          value={note}
          onChangeText={setNote}
          style={[styles.note, { borderColor: theme.line }]}
        />
        <Button
          label={t('menu.add', {
            price: formatMoney(pesewas(total), venue.data?.currency ?? DEFAULT_CURRENCY),
          })}
          disabled={!item.available}
          onPress={() => {
            add(slug, {
              menuItemId: item.id,
              name: item.name.en,
              quantity,
              unitPricePesewas: pesewas(item.pricePesewas),
              modifierPesewas: pesewas(0),
              modifierOptionIds: [],
              note: note.trim() || undefined,
            });
            router.back();
          }}
        />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  sheet: {
    marginTop: 'auto',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 8,
  },
  photo: { width: '100%', height: 180, borderRadius: 16, marginBottom: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16, marginVertical: 12 },
  step: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
  },
  note: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
});
