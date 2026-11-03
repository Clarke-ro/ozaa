import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import { cartEstimate, linesFor, useCart } from '@/features/cart';
import { useGuestSession } from '@/features/session';
import { DEFAULT_CURRENCY, formatMoney } from '@/lib/money';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { SafeScreen } from '@/ui/Screen';
import { PriceText } from '@/ui/PriceText';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function OrderSheet({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const lines = useCart((state) => linesFor(state, slug));
  const venue = useVenue(slug);
  const currency = venue.data?.currency ?? DEFAULT_CURRENCY;
  const clear = useCart((state) => state.clear);
  const setOrderId = useGuestSession((state) => state.setOrderId);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);

  return (
    <SafeScreen>
      <View style={[styles.sheet, { backgroundColor: theme.white }]}>
        <Text variant="display-m">{t('menu.viewOrder')}</Text>
        {lines.map((line) => (
          <View key={line.key} style={styles.row}>
            <Text variant="body">
              {line.quantity} × {line.name}
            </Text>
            <PriceText
              amount={(line.unitPricePesewas + line.modifierPesewas) * line.quantity}
              currency={currency}
            />
          </View>
        ))}
        <View style={styles.row}>
          <Text variant="body-strong">{t('status.total')}</Text>
          <Text variant="body-strong" style={{ fontVariant: ['tabular-nums'] }}>
            {formatMoney(cartEstimate(lines), currency)}
          </Text>
        </View>
        {error ? <Text style={{ color: theme.error }}>{t('errors.generic')}</Text> : null}
        <Button
          label={t('menu.send')}
          loading={sending}
          disabled={lines.length === 0}
          onPress={() => {
            setSending(true);
            setError(false);
            const clientOrderId = Crypto.randomUUID();
            api
              .createOrder(
                {
                  clientOrderId,
                  lines: lines.map((line) => ({
                    menuItemId: line.menuItemId,
                    quantity: line.quantity,
                    modifierOptionIds: line.modifierOptionIds,
                    note: line.note,
                  })),
                },
                { idempotencyKey: clientOrderId },
              )
              .then((order) => {
                setOrderId(order.id);
                clear();
                router.replace(`/${slug}/status`);
              })
              .catch(() => {
                setSending(false);
                setError(true);
              });
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
    gap: 12,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
