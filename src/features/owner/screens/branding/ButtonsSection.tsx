import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { Section, SectionBody, Segmented } from '../../kit';
import type { Tint } from './look';

export const BUTTON_KEYS = ['menu', 'waiter', 'wifi', 'socials', 'links'] as const;

/** Button label colour, and the order of the buttons on the guest page (the first one is filled). */
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
  const move = (index: number, by: -1 | 1) => {
    const next = [...order];
    const [item] = next.splice(index, 1);
    if (item === undefined) return;
    next.splice(index + by, 0, item);
    onOrder(next);
  };
  return (
    <Section title={t('ownerBranding.buttons')} note={t('ownerBranding.buttonsNote')}>
      <SectionBody>
        <Text variant="body">{t('ownerBranding.tint')}</Text>
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
      </SectionBody>
      {order.map((key, index) => {
        const label = t(`ownerBranding.button.${key}`);
        return (
          <View key={key} style={styles.row}>
            <Text variant="caption" style={[styles.num, { color: theme.muted }]}>
              {index + 1}
            </Text>
            <Text variant="body" style={styles.flex}>
              {label}
            </Text>
            <Arrow
              label={t('ownerMenu.moveUp', { name: label })}
              disabled={index === 0}
              onPress={() => move(index, -1)}
            >
              <ArrowUp size={18} color={index === 0 ? theme.meta : theme.text} />
            </Arrow>
            <Arrow
              label={t('ownerMenu.moveDown', { name: label })}
              disabled={index === order.length - 1}
              onPress={() => move(index, 1)}
            >
              <ArrowDown size={18} color={index === order.length - 1 ? theme.meta : theme.text} />
            </Arrow>
          </View>
        );
      })}
    </Section>
  );
}

function Arrow({
  label,
  disabled,
  onPress,
  children,
}: {
  label: string;
  disabled: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={styles.arrow}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: 52,
    paddingLeft: tokens.space[4],
  },
  num: { width: 16, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  arrow: {
    width: tokens.touchTarget,
    height: tokens.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
