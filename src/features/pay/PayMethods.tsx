import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CreditCard, Smartphone } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';

export type PayMethod = 'mtn' | 'vod' | 'atl' | 'card';

// Order and labels for the methods; MoMo networks first, as most guests pay that way.
export const PAY_METHODS: readonly { id: PayMethod; label: string }[] = [
  { id: 'mtn', label: 'pay.mtn' },
  { id: 'vod', label: 'pay.telecel' },
  { id: 'atl', label: 'pay.at' },
  { id: 'card', label: 'pay.card' },
];

/**
 * How to pay, as clean radio cards (line icon, name, a ring that fills). Choosing a MoMo network
 * opens the phone box right under it, so the number sits next to the choice it belongs to.
 */
export function PayMethods({
  value,
  onChange,
  phone,
  onPhone,
  hint,
}: {
  value: PayMethod;
  onChange: (method: PayMethod) => void;
  phone: string;
  onPhone: (text: string) => void;
  /** A small line under the phone box (test-mode note in demo builds). */
  hint?: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {PAY_METHODS.map((m) => {
        const on = value === m.id;
        return (
          <View
            key={m.id}
            style={[
              styles.card,
              { backgroundColor: theme.surface, borderColor: on ? theme.ink : theme.surface },
            ]}
          >
            <Pressable
              accessibilityRole="radio"
              aria-checked={on}
              accessibilityLabel={t(m.label)}
              onPress={() => onChange(m.id)}
              style={styles.row}
            >
              {m.id === 'card' ? (
                <CreditCard size={22} color={theme.ink} />
              ) : (
                <Smartphone size={22} color={theme.ink} />
              )}
              <Text variant="body-strong" style={styles.flex}>
                {t(m.label)}
              </Text>
              <View style={[styles.ring, { borderColor: on ? theme.ink : theme.line }]}>
                {on ? <View style={[styles.dot, { backgroundColor: theme.ink }]} /> : null}
              </View>
            </Pressable>
            {on && m.id !== 'card' ? (
              <View style={styles.phone}>
                <TextInput
                  accessibilityLabel={t('pay.phone')}
                  placeholder={t('pay.phone')}
                  placeholderTextColor={theme.meta}
                  value={phone}
                  onChangeText={onPhone}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  style={[styles.input, { borderColor: theme.line, color: theme.text }]}
                />
                {hint ? (
                  <Text variant="caption" style={{ color: theme.meta }}>
                    {hint}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const RING = 22;

const styles = StyleSheet.create({
  list: { gap: tokens.space[2] },
  card: {
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 56,
    paddingHorizontal: tokens.space[4],
  },
  flex: { flex: 1 },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: RING / 2, height: RING / 2, borderRadius: RING / 4 },
  phone: {
    gap: tokens.space[1],
    paddingHorizontal: tokens.space[4],
    paddingBottom: tokens.space[4],
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.space[3],
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
  },
});
