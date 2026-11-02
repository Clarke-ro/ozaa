import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { LoyaltyProgram } from '@/lib/api/types';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';

export function OwnerLoyaltySetup({
  venueId,
  program,
  hasActivity,
}: {
  venueId: string;
  program: LoyaltyProgram;
  hasActivity: boolean;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const client = useQueryClient();
  const [draft, setDraft] = useState<LoyaltyProgram>(program);
  const [feedback, setFeedback] = useState<string | null>(null);

  const mode = draft.earn.kind;

  const switchMode = (nextMode: 'stamps' | 'points') => {
    if (hasActivity && nextMode !== mode) {
      setFeedback(t('owner.loyaltyModeLocked'));
      return;
    }
    setFeedback(null);
    if (nextMode === 'stamps') {
      setDraft({ ...draft, earn: { kind: 'stamps' } });
    } else {
      setDraft({ ...draft, earn: { kind: 'points', points: 1, perMinor: 100 } });
    }
  };

  const save = useMutation({
    mutationFn: () => api.ownerSetLoyalty(venueId, draft),
    onSuccess: () => {
      setFeedback(t('owner.loyaltySaved'));
      void client.invalidateQueries({ queryKey: ['owner-loyalty', venueId] });
      void client.invalidateQueries({ queryKey: ['owner-loyalty-members', venueId] });
      void client.invalidateQueries({ queryKey: ['loyalty'] });
    },
    onError: () => setFeedback(t('owner.loyaltyModeLocked')),
  });

  const rewards = draft.rewards;
  const tiers = draft.tiers;

  return (
    <View style={[styles.card, { borderColor: theme.line }]}>
      <View style={styles.rowBetween}>
        <Text variant="title">{t('owner.loyaltySetupTitle')}</Text>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t('owner.loyaltyEnabled')}
          accessibilityState={{ checked: draft.enabled }}
          onPress={() => setDraft({ ...draft, enabled: !draft.enabled })}
          style={[
            styles.pill,
            {
              backgroundColor: draft.enabled ? theme.fill : theme.wash,
              borderColor: draft.enabled ? theme.fill : theme.line,
            },
          ]}
        >
          <Text variant="caption" style={{ color: draft.enabled ? theme.onFill : theme.text }}>
            {draft.enabled ? 'On' : 'Off'}
          </Text>
        </Pressable>
      </View>

      <Text variant="caption" style={{ color: theme.meta }}>
        {t('owner.loyaltyEnabled')}
      </Text>
      <View style={styles.row}>
        {(['stamps', 'points'] as const).map((item) => {
          const active = mode === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              onPress={() => switchMode(item)}
              style={[
                styles.modeBtn,
                {
                  backgroundColor: active ? theme.ink : theme.white,
                  borderColor: active ? theme.ink : theme.line,
                },
              ]}
            >
              <Text variant="caption" style={{ color: active ? theme.white : theme.text }}>
                {item === 'stamps' ? t('owner.loyaltyModeStamps') : t('owner.loyaltyModePoints')}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {hasActivity ? (
        <Text variant="caption" style={{ color: theme.meta }}>
          {t('owner.loyaltyModeLocked')}
        </Text>
      ) : null}

      {draft.earn.kind === 'points' ? (
        <View style={styles.row}>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption">Points</Text>
            <TextInput
              accessibilityLabel="Points"
              value={String(draft.earn.points)}
              keyboardType="number-pad"
              onChangeText={(val) => {
                if (draft.earn.kind !== 'points') return;
                setDraft({
                  ...draft,
                  earn: { ...draft.earn, points: Math.max(1, Number(val) || 1) },
                });
              }}
              style={[styles.input, { borderColor: theme.line }]}
            />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text variant="caption">Per minor units</Text>
            <TextInput
              accessibilityLabel="Per minor units"
              value={String(draft.earn.perMinor)}
              keyboardType="number-pad"
              onChangeText={(val) => {
                if (draft.earn.kind !== 'points') return;
                setDraft({
                  ...draft,
                  earn: { ...draft.earn, perMinor: Math.max(1, Number(val) || 100) },
                });
              }}
              style={[styles.input, { borderColor: theme.line }]}
            />
          </View>
        </View>
      ) : null}

      <Text variant="body-strong">{t('owner.loyaltyRewardsTitle')}</Text>
      {rewards.map((reward, index) => (
        <View key={reward.id} style={styles.row}>
          <TextInput
            accessibilityLabel={`${t('owner.loyaltyRewardTitle')} ${index + 1}`}
            value={reward.title}
            onChangeText={(title) => {
              const next = rewards.map((r, i) => (i === index ? { ...r, title } : r));
              setDraft({ ...draft, rewards: next });
            }}
            style={[styles.input, { flex: 2, borderColor: theme.line }]}
          />
          <TextInput
            accessibilityLabel={`${t('owner.loyaltyRewardCost')} ${index + 1}`}
            value={String(reward.cost)}
            keyboardType="number-pad"
            onChangeText={(val) => {
              const cost = Math.max(1, Number(val) || 1);
              const next = rewards.map((r, i) => (i === index ? { ...r, cost } : r));
              setDraft({ ...draft, rewards: next });
            }}
            style={[styles.input, { flex: 1, borderColor: theme.line }]}
          />
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const next = [
            ...rewards,
            { id: `rwd_${rewards.length + 1}`, title: 'House Drink', cost: 4 },
          ];
          setDraft({ ...draft, rewards: next });
        }}
        style={[styles.outlineBtn, { borderColor: theme.line }]}
      >
        <Text variant="caption">+ {t('owner.loyaltyAddReward')}</Text>
      </Pressable>

      <Text variant="body-strong">{t('owner.loyaltyTiersTitle')}</Text>
      <View style={styles.row}>
        {tiers.map((band, index) => (
          <View key={band.id} style={{ flex: 1, gap: 4 }}>
            <Text variant="caption">{t(`loyalty.tiers.${band.id}`)}</Text>
            <TextInput
              accessibilityLabel={`${band.id} threshold`}
              value={String(band.minLifetime)}
              keyboardType="number-pad"
              editable={band.id !== 'bronze'}
              onChangeText={(val) => {
                const minLifetime = Math.max(0, Number(val) || 0);
                const next = tiers.map((b, i) => (i === index ? { ...b, minLifetime } : b));
                setDraft({ ...draft, tiers: next });
              }}
              style={[styles.input, { borderColor: theme.line }]}
            />
          </View>
        ))}
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text variant="caption">{t('owner.loyaltyExpiryDays')}</Text>
          <TextInput
            accessibilityLabel={t('owner.loyaltyExpiryDays')}
            value={String(draft.expiryDays ?? 180)}
            keyboardType="number-pad"
            onChangeText={(val) =>
              setDraft({ ...draft, expiryDays: Math.max(1, Number(val) || 180) })
            }
            style={[styles.input, { borderColor: theme.line }]}
          />
        </View>
        <View style={{ flex: 2, gap: 4 }}>
          <Text variant="caption">{t('owner.loyaltyBirthday')}</Text>
          <TextInput
            accessibilityLabel={t('owner.loyaltyBirthday')}
            value={draft.birthdayTreat ?? ''}
            onChangeText={(val) => setDraft({ ...draft, birthdayTreat: val || null })}
            style={[styles.input, { borderColor: theme.line }]}
          />
        </View>
      </View>

      {feedback ? (
        <Text variant="caption" style={{ color: theme.fill }}>
          {feedback}
        </Text>
      ) : null}

      <Button
        label={t('owner.save')}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  modeBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineBtn: {
    borderWidth: 1,
    borderRadius: 12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
  },
});
