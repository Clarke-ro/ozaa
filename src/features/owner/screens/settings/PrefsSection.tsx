import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';
import type { OwnerNotificationKind } from '@/lib/api/types';
import { useOwnerPrefs } from '../../data/ownerPrefs';
import { Section, SectionBody, Segmented, SwitchRow } from '../../kit';
import { useProfile } from './useProfile';

const KINDS: readonly OwnerNotificationKind[] = ['order', 'call', 'bill', 'guest_note', 'review'];

/**
 * Appearance, sound and which notifications this person gets. Appearance and sound also live on
 * this device, so the app looks and sounds right before the profile loads.
 */
export function PrefsSection() {
  const { t } = useTranslation();
  const { prefs, save } = useProfile();
  const appearance = useOwnerPrefs((state) => state.appearance);
  const setAppearance = useOwnerPrefs((state) => state.setAppearance);
  const chime = useOwnerPrefs((state) => state.chime);
  const setChime = useOwnerPrefs((state) => state.setChime);
  return (
    <View style={{ gap: tokens.space[4] }}>
      <Section title={t('ownerSettings.appearance')}>
        <SectionBody>
          <Segmented
            label={t('ownerSettings.appearance')}
            value={appearance}
            onChange={(next) => {
              setAppearance(next);
              save.mutate({ prefs: { ...prefs, appearance: next } });
            }}
            options={(['light', 'dark', 'system'] as const).map((id) => ({
              id,
              label: t(`ownerSettings.look.${id}`),
            }))}
          />
        </SectionBody>
        <SwitchRow
          label={t('ownerSettings.chime')}
          value={chime}
          onChange={(on) => {
            setChime(on);
            save.mutate({ prefs: { ...prefs, soundForNewOrders: on } });
          }}
        />
      </Section>
      <Section title={t('ownerSettings.notifyTitle')} note={t('ownerSettings.notifyNote')}>
        {KINDS.map((kind) => (
          <SwitchRow
            key={kind}
            label={t(`ownerNotes.kinds.${kind}`)}
            value={prefs.notify[kind]}
            onChange={(on) =>
              save.mutate({ prefs: { ...prefs, notify: { ...prefs.notify, [kind]: on } } })
            }
          />
        ))}
      </Section>
    </View>
  );
}
