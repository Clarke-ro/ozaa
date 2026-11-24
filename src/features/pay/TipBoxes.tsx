import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { TIPS, type TipPercent } from './payPick';

/**
 * "Add a tip for the team" as four equal boxes (design canvas, Clarke 2026-11-23). The chosen
 * one has a light venue-colour fill, a venue-colour border and venue-colour text.
 */
export function TipBoxes({
  value,
  onChange,
}: {
  value: TipPercent;
  onChange: (tip: TipPercent) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={styles.block}>
      <Text variant="title" accessibilityRole="header">
        {t('pay.tip')}
      </Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={t('pay.tip')} style={styles.row}>
        {TIPS.map((tip) => {
          const on = tip === value;
          return (
            <Pressable
              key={tip}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              aria-checked={on}
              onPress={() => onChange(tip)}
              style={({ pressed }) => [
                styles.box,
                on
                  ? { borderColor: theme.fill, backgroundColor: theme.tint, borderWidth: 2 }
                  : {
                      borderColor: theme.line,
                      backgroundColor: pressed ? theme.wash : theme.white,
                    },
              ]}
            >
              <Text
                variant="caption"
                style={[styles.label, on && styles.strong, { color: on ? theme.ink : theme.text }]}
              >
                {tip === 0 ? t('pay.noTip') : `${tip}%`}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: tokens.space[3] },
  row: { flexDirection: 'row', gap: tokens.space[2] },
  box: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 14, lineHeight: 18 },
  strong: { fontWeight: '600' },
});
