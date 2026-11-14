import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react-native';
import { TIER_DOTS } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, ModalSheet, Stepper, Toggle } from '../../kit';
import type { Tier } from './program';

/**
 * "Tiers" (design canvas): a switch beside the title, then Bronze, Silver and Gold with the stamps
 * each one starts at and an edit pencil. Bronze always starts with the first stamp.
 */
export function TiersSection({
  on,
  tiers,
  onToggle,
  onChange,
}: {
  on: boolean;
  tiers: Tier[];
  onToggle: (next: boolean) => void;
  onChange: (next: Tier[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [editing, setEditing] = useState<Tier | null>(null);
  const [from, setFrom] = useState(0);
  const name = (id: Tier['id']) => t(`ownerLoyalty.tier.${id}`);
  return (
    <View style={styles.section}>
      <View style={styles.head}>
        <Text variant="title" accessibilityRole="header" style={styles.flex}>
          {t('ownerLoyalty.tiersTitle')}
        </Text>
        <Toggle value={on} label={t('ownerLoyalty.tiersTitle')} onChange={onToggle} />
      </View>
      {on ? (
        <View style={[cardStyle(theme), styles.card]}>
          {tiers.map((tier, i) => (
            <Fragment key={tier.id}>
              <View
                style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.wash }]}
              >
                <View style={[styles.dot, { backgroundColor: TIER_DOTS[tier.id] }]} />
                <Text variant="body" style={styles.flex}>
                  {name(tier.id)}
                </Text>
                <Text style={[styles.from, { color: theme.muted }]}>
                  {tier.minLifetime === 0
                    ? t('ownerLoyalty.fromFirst')
                    : t('ownerLoyalty.fromStamps', { count: tier.minLifetime })}
                </Text>
                {tier.id === 'bronze' ? (
                  <View style={styles.icon} />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ownerLoyalty.editTier', { name: name(tier.id) })}
                    onPress={() => {
                      setFrom(tier.minLifetime);
                      setEditing(tier);
                    }}
                    style={({ pressed }) => [
                      styles.icon,
                      pressed && { backgroundColor: theme.wash },
                    ]}
                  >
                    <Pencil size={18} color={theme.muted} />
                  </Pressable>
                )}
              </View>
            </Fragment>
          ))}
        </View>
      ) : null}
      <ModalSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? t('ownerLoyalty.editTier', { name: name(editing.id) }) : ''}
        footer={
          <Button
            label={t('ownerLoyalty.saveReward')}
            onPress={() => {
              if (editing)
                onChange(tiers.map((x) => (x.id === editing.id ? { ...x, minLifetime: from } : x)));
              setEditing(null);
            }}
          />
        }
      >
        <View style={styles.row}>
          <Text variant="body" style={styles.flex}>
            {t('ownerLoyalty.tierFrom')}
          </Text>
          <Stepper
            label={t('ownerLoyalty.tierFrom')}
            value={from}
            min={1}
            max={500}
            onChange={setFrom}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.space[4] },
  head: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  card: {
    paddingVertical: 2,
    paddingLeft: tokens.owner.controls.cardPadding,
    paddingRight: tokens.space[2],
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 60 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  from: { fontSize: 15, lineHeight: 20 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
