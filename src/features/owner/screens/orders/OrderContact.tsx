import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MapPin, Phone, UserRound } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { formatPhone } from '@/lib/phone';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

/**
 * Who a menu-link order is for and where it goes, on the order's own page. The phone is a
 * tap-to-call button. Shown to staff only; nothing here is logged (Act 843).
 */
export function OrderContact({ order }: { order: Order }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!order.contact) return null;
  const { name, phone } = order.contact;
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <UserRound size={16} color={theme.muted} />
        <Text variant="body-strong">{name}</Text>
      </View>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('ownerOrders.call', { name })}
        onPress={() => void Linking.openURL(`tel:${phone}`)}
        style={({ pressed }) => [styles.row, styles.tap, pressed && { opacity: 0.7 }]}
      >
        <Phone size={16} color={theme.ink} />
        <Text variant="body" style={{ color: theme.ink }}>
          {formatPhone(phone)}
        </Text>
      </Pressable>
      {order.deliveryAddress ? (
        <View style={styles.row}>
          <MapPin size={16} color={theme.muted} />
          <Text variant="body" style={styles.flex}>
            {order.deliveryAddress}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { gap: tokens.space[1] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  tap: { minHeight: tokens.touchTarget },
  flex: { flex: 1 },
});
