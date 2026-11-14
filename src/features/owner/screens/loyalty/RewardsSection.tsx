import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Gift, Pencil } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { AddDashed, cardStyle, Field, ModalSheet, Stepper } from '../../kit';
import type { Reward } from './program';

/**
 * "Rewards" (design canvas): one card per reward with when it unlocks and an edit pencil, then
 * "Add a reward". Editing opens a small sheet with the name and the stamps it costs.
 */
export function RewardsSection({
  rewards,
  stamps,
  error,
  onChange,
}: {
  rewards: Reward[];
  /** Stamps on a full card: the most a reward can cost. */
  stamps: number;
  error?: string;
  onChange: (next: Reward[]) => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  // The index being edited, or 'new'.
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const current =
    editing === 'new'
      ? { id: '', title: '', cost: stamps }
      : editing !== null
        ? rewards[editing]
        : null;
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState(stamps);
  const open = (i: number | 'new') => {
    const r = i === 'new' ? { title: '', cost: stamps } : rewards[i];
    setTitle(r?.title ?? '');
    setCost(r?.cost ?? stamps);
    setEditing(i);
  };
  const save = () => {
    const next = { id: current?.id ?? '', title: title.trim(), cost };
    onChange(
      editing === 'new' ? [...rewards, next] : rewards.map((r, i) => (i === editing ? next : r)),
    );
    setEditing(null);
  };
  const remove = () => {
    if (typeof editing === 'number') onChange(rewards.filter((_, i) => i !== editing));
    setEditing(null);
  };
  return (
    <View style={styles.section}>
      <Text variant="title" accessibilityRole="header">
        {t('ownerLoyalty.rewardsTitle')}
      </Text>
      {rewards.map((r, i) => (
        <View key={`${r.id}-${i}`} style={[cardStyle(theme), styles.row]}>
          <Gift size={20} color={theme.text} />
          <View style={styles.words}>
            <Text style={styles.name}>{r.title}</Text>
            <Text style={[styles.sub, { color: theme.meta }]}>
              {t('ownerLoyalty.atStamps', { count: r.cost })}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ownerLoyalty.editReward', { name: r.title })}
            onPress={() => open(i)}
            style={({ pressed }) => [styles.icon, pressed && { backgroundColor: theme.wash }]}
          >
            <Pencil size={18} color={theme.muted} />
          </Pressable>
        </View>
      ))}
      <AddDashed label={t('ownerLoyalty.addReward')} onPress={() => open('new')} />
      {error ? <Text style={[styles.sub, { color: theme.error }]}>{error}</Text> : null}
      <ModalSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? t('ownerLoyalty.addReward') : t('ownerLoyalty.editRewardTitle')}
        footer={
          <View style={styles.actions}>
            {typeof editing === 'number' ? (
              <Button label={t('ownerLoyalty.removeReward')} tone="ghost" onPress={remove} />
            ) : null}
            <Button label={t('ownerLoyalty.saveReward')} disabled={!title.trim()} onPress={save} />
          </View>
        }
      >
        <Field
          label={t('ownerLoyalty.reward')}
          value={title}
          onChangeText={setTitle}
          placeholder={t('ownerLoyalty.rewardHint')}
        />
        <View style={styles.costRow}>
          <Text variant="body" style={styles.words}>
            {t('ownerLoyalty.rewardCost')}
          </Text>
          <Stepper
            label={t('ownerLoyalty.rewardCost')}
            value={cost}
            min={1}
            max={stamps}
            onChange={setCost}
          />
        </View>
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: tokens.owner.controls.listGap },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingLeft: 18,
    paddingRight: tokens.space[2],
  },
  words: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: tokens.space[2] },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
});
