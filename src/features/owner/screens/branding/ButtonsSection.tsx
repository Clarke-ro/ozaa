import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Segmented } from '../../kit';
import { DragList } from '../../kit/DragList';
import type { Tint } from './look';

export const BUTTON_KEYS = ['menu', 'waiter', 'wifi', 'socials', 'links'] as const;

/** Button label colour, and the order of the buttons (hold the grip and drag; the first is filled). */
export function ButtonsSection({
  order,
  onOrder,
  tint,
  onTint,
  readable,
}: {
  order: string[];
  onOrder: (next: string[]) => void;
  tint: Tint;
  onTint: (tint: Tint) => void;
  readable: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      <View style={styles.block}>
        <Text variant="body-strong" style={styles.label}>
          {t('ownerBranding.tint')}
        </Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
          <Segmented<Tint>
            label={t('ownerBranding.tint')}
            value={tint}
            onChange={onTint}
            options={[
              { id: 'auto', label: t('ownerBranding.tints.auto') },
              { id: 'light', label: t('ownerBranding.tints.light') },
              { id: 'dark', label: t('ownerBranding.tints.dark') },
            ]}
          />
          {readable ? null : (
            <Text variant="caption" accessibilityLiveRegion="polite" style={{ color: theme.error }}>
              {t('ownerBranding.tintWarning')}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.block}>
        <Text variant="body-strong" style={styles.label}>
          {t('ownerBranding.orderLabel')}
        </Text>
        <DragList
          items={order.map((key) => ({ key, label: t(`ownerBranding.button.${key}`) }))}
          onOrder={onOrder}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  block: { gap: tokens.space[2] },
  label: { fontSize: tokens.type.caption.size + 1 },
  card: {
    gap: tokens.space[2],
    padding: tokens.space[3],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
