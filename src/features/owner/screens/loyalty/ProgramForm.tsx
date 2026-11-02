import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/api';
import type { LoyaltyProgram } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { useDraft } from '../../data/useDraft';
import {
  InputRow,
  SaveBar,
  Section,
  SectionBody,
  Segmented,
  Stepper,
  SwitchRow,
  toast,
} from '../../kit';
import { formFrom, programFrom, STAMPS, WINBACK_DAYS, type Cooldown } from './program';
import { StampPreview } from './StampPreview';
import { TreatToggle } from './TreatToggle';

/** Form state and save for the program. Lives in the screen so its SaveBar can be pinned to the page. */
export function useProgramEditor(venueId: string, program: LoyaltyProgram | undefined) {
  const { t } = useTranslation();
  const client = useQueryClient();
  const draft = useDraft(formFrom(program));
  const [showErrors, setShowErrors] = useState(false);
  const save = useMutation({
    mutationFn: (next: LoyaltyProgram) => api.ownerSetLoyalty(venueId, next),
    onSuccess: () => {
      toast.success(t('ownerLoyalty.saved'));
      draft.reset();
      setShowErrors(false);
      void client.invalidateQueries({ queryKey: ownerKeys.loyalty(venueId) });
      void client.invalidateQueries({ queryKey: ['loyalty'] });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  const submit = () => {
    if (!program) return;
    const result = programFrom(program, draft.value);
    if (!result.ok) {
      setShowErrors(true);
      toast.error(t('ownerLoyalty.rewardMissing'));
      return;
    }
    save.mutate(result.program);
  };
  const saveBar = (
    <SaveBar
      visible={draft.dirty}
      saving={save.isPending}
      onDiscard={draft.reset}
      onSave={submit}
    />
  );
  return { draft, showErrors, saveBar };
}

/** The stamp card rules, in three short sections. */
export function ProgramForm({ editor }: { editor: ReturnType<typeof useProgramEditor> }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { draft, showErrors } = editor;
  const f = draft.value;
  const missingReward = showErrors && f.enabled && !f.reward.trim();

  return (
    <View style={styles.stack}>
      <Section title={t('ownerLoyalty.card')}>
        <SwitchRow
          label={t('ownerLoyalty.on')}
          hint={t('ownerLoyalty.onHint')}
          value={f.enabled}
          onChange={(v) => draft.set('enabled', v)}
        />
        <InputRow
          label={t('ownerLoyalty.reward')}
          value={f.reward}
          onChangeText={(v) => draft.set('reward', v)}
          placeholder={t('ownerLoyalty.rewardHint')}
          error={missingReward ? t('ownerLoyalty.rewardMissing') : undefined}
        />
        <SectionBody>
          <View style={styles.row}>
            <Text variant="body" style={styles.flex}>
              {t('ownerLoyalty.stamps')}
            </Text>
            <Stepper
              label={t('ownerLoyalty.stamps')}
              value={f.stamps}
              min={STAMPS.min}
              max={STAMPS.max}
              onChange={(n) => draft.set('stamps', n)}
            />
          </View>
        </SectionBody>
        <TreatToggle
          label={t('ownerLoyalty.halfway')}
          value={f.halfway}
          onChange={(v) => draft.set('halfway', v)}
        />
        <SectionBody>
          <StampPreview stamps={f.stamps} reward={f.reward} />
        </SectionBody>
      </Section>

      <Section title={t('ownerLoyalty.gap')} note={t('ownerLoyalty.gapNote')}>
        <SectionBody>
          <Segmented<Cooldown>
            label={t('ownerLoyalty.gap')}
            value={f.cooldown}
            onChange={(v) => draft.set('cooldown', v)}
            options={(['none', '1h', '4h', '1d'] as const).map((id) => ({
              id,
              label: t(`ownerLoyalty.cooldown.${id}`),
            }))}
          />
        </SectionBody>
      </Section>

      <Section title={t('ownerLoyalty.treats')} note={t('ownerLoyalty.treatsNote')}>
        <TreatToggle
          label={t('ownerLoyalty.welcome')}
          value={f.welcome}
          onChange={(v) => draft.set('welcome', v)}
        />
        <TreatToggle
          label={t('ownerLoyalty.birthday')}
          value={f.birthday}
          onChange={(v) => draft.set('birthday', v)}
        />
        <TreatToggle
          label={t('ownerLoyalty.winback')}
          value={f.winback}
          onChange={(v) => draft.set('winback', v)}
        />
        {f.winback.trim() ? (
          <SectionBody>
            <View style={styles.row}>
              <Text variant="body" style={[styles.flex, { color: theme.muted }]}>
                {t('ownerLoyalty.winbackAfter', { count: f.winbackDays })}
              </Text>
              <Stepper
                label={t('ownerLoyalty.winbackDays')}
                value={f.winbackDays}
                min={WINBACK_DAYS.min}
                max={WINBACK_DAYS.max}
                onChange={(n) => draft.set('winbackDays', n)}
              />
            </View>
          </SectionBody>
        ) : null}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.space[5] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
});
