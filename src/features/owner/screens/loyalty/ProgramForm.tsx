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
import { SaveBar, Section, SectionBody, Segmented, Stepper, SwitchRow, toast } from '../../kit';
import {
  EXPIRY_CHOICES,
  formFrom,
  programFrom,
  STAMPS,
  WINBACK_DAYS,
  type Cooldown,
  type Expiry,
} from './program';
import { RewardsSection } from './RewardsSection';
import { StampPreview } from './StampPreview';
import { TiersSection } from './TiersSection';
import { TreatToggle } from './TreatToggle';
import { InlineRow } from '../settings/InlineRow';
import { Gift, Hash } from 'lucide-react-native';
import { guestKeys } from '@/lib/queryKeys';

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
      void client.invalidateQueries({ queryKey: guestKeys.loyaltyAll() });
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

/**
 * The programme as on the design canvas, one section after another: the stamp card (on, stamps
 * or points, stamps on a full card), rewards, tiers, how long stamps last, the time between stamps,
 * and treats. `preview` adds the stamp card picture for screens with no phone beside the form.
 */
export function ProgramForm({
  editor,
  preview = true,
}: {
  editor: ReturnType<typeof useProgramEditor>;
  /** False when the guest preview sits beside the form instead (desktop). */
  preview?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { draft, showErrors } = editor;
  const f = draft.value;
  const missingReward = showErrors && f.enabled && f.rewards.every((r) => !r.title.trim());
  const expiryLabel = (d: Expiry) => (d === null ? 'never' : String(d));

  return (
    <View style={styles.stack}>
      <Section title={t('ownerLoyalty.card')}>
        <SwitchRow
          label={t('ownerLoyalty.onShort')}
          value={f.enabled}
          onChange={(v) => draft.set('enabled', v)}
        />
        <InlineRow icon={Hash} label={t('ownerLoyalty.earnWith')}>
          <Segmented<'stamps' | 'points'>
            label={t('ownerLoyalty.earnWith')}
            value={f.earn}
            onChange={(v) => draft.set('earn', v)}
            options={[
              { id: 'stamps', label: t('ownerLoyalty.earn.stamps') },
              { id: 'points', label: t('ownerLoyalty.earn.points') },
            ]}
          />
        </InlineRow>
        <InlineRow icon={Gift} label={t('ownerLoyalty.fullCard')}>
          <Stepper
            label={t('ownerLoyalty.fullCard')}
            value={f.stamps}
            min={STAMPS.min}
            max={STAMPS.max}
            onChange={(n) => draft.set('stamps', n)}
          />
        </InlineRow>
        <SwitchRow
          label={t('ownerLoyalty.stampOnPaid')}
          hint={t('ownerLoyalty.stampOnPaidHint')}
          value={f.stampOnPaid}
          onChange={(v) => draft.set('stampOnPaid', v)}
        />
        {preview ? (
          <SectionBody>
            <StampPreview stamps={f.stamps} reward={f.rewards[f.rewards.length - 1]?.title ?? ''} />
          </SectionBody>
        ) : null}
      </Section>

      <RewardsSection
        rewards={f.rewards}
        stamps={f.stamps}
        error={missingReward ? t('ownerLoyalty.rewardMissing') : undefined}
        onChange={(next) => draft.set('rewards', next)}
      />

      <TiersSection
        on={f.tiersOn}
        tiers={f.tiers}
        onToggle={(v) => draft.set('tiersOn', v)}
        onChange={(next) => draft.set('tiers', next)}
      />

      <View style={styles.group}>
        <Text variant="title" accessibilityRole="header">
          {t('ownerLoyalty.stampsLast')}
        </Text>
        <Segmented<string>
          label={t('ownerLoyalty.stampsLast')}
          value={expiryLabel(f.expiryDays)}
          onChange={(v) => draft.set('expiryDays', v === 'never' ? null : (Number(v) as Expiry))}
          options={EXPIRY_CHOICES.map((d) => ({
            id: expiryLabel(d),
            label: t(`ownerLoyalty.expiry.${expiryLabel(d)}`),
          }))}
        />
      </View>

      <View style={styles.group}>
        <Text variant="title" accessibilityRole="header">
          {t('ownerLoyalty.gap')}
        </Text>
        <Segmented<Cooldown>
          label={t('ownerLoyalty.gap')}
          value={f.cooldown}
          onChange={(v) => draft.set('cooldown', v)}
          options={(['none', '1h', '4h', '1d'] as const).map((id) => ({
            id,
            label: t(`ownerLoyalty.cooldown.${id}`),
          }))}
        />
        <Text style={[styles.note, { color: theme.meta }]}>{t('ownerLoyalty.gapNote')}</Text>
      </View>

      <Section title={t('ownerLoyalty.treats')}>
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
  // Canvas: 40 px between the programme's sections.
  stack: { gap: tokens.space[10] },
  group: { gap: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1 },
  note: { fontSize: 13, lineHeight: 18 },
});
