import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Clock, Smartphone } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { PayWhen } from './payWhen';

/** "Pay now" or "Pay later", as radio cards like the Pay page's payment methods. */
export function PayWhenChoice({
  value,
  onChange,
  laterKey,
}: {
  value: PayWhen;
  onChange: (value: PayWhen) => void;
  /** What "later" means here: the bill after the meal, at pickup, or on delivery. */
  laterKey: string;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const options = [
    { id: 'now' as const, Icon: Smartphone, title: t('payWhen.now'), hint: t('payWhen.nowHint') },
    { id: 'later' as const, Icon: Clock, title: t('payWhen.later'), hint: t(laterKey) },
  ];
  return (
    <View style={styles.block}>
      <Text variant="title" accessibilityRole="header">
        {t('payWhen.title')}
      </Text>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {options.map(({ id, Icon, title, hint }) => {
          const on = value === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              accessibilityLabel={`${title}. ${hint}`}
              onPress={() => onChange(id)}
              style={[
                styles.card,
                { backgroundColor: theme.surface, borderColor: on ? theme.ink : theme.line },
              ]}
            >
              <Icon size={20} color={theme.ink} strokeWidth={2} />
              <View style={styles.copy}>
                <Text variant="body-strong">{title}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {hint}
                </Text>
              </View>
              <View style={[styles.ring, { borderColor: on ? theme.ink : theme.line }]}>
                {on ? <View style={[styles.dot, { backgroundColor: theme.ink }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[3] },
  list: { gap: tokens.space[2] },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 64,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderWidth: 1.5,
  },
  copy: { flex: 1, gap: 2 },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
