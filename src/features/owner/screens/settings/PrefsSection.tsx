import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { tokens } from '@/theme/tokens';
import type { OwnerNotificationKind } from '@/lib/api/types';
import { useOwnerPrefs } from '../../data/ownerPrefs';
import { useState } from 'react';
import { Bell, Globe, SunMoon, Volume2 } from 'lucide-react-native';
import { languageByCode } from '@/features/venue';
import { LinkRow, Section, Segmented, SwitchRow, Toggle } from '../../kit';
import { InlineRow } from './InlineRow';
import { useProfile } from './useProfile';

const KINDS: readonly OwnerNotificationKind[] = ['order', 'call', 'bill', 'guest_note', 'review'];

/**
 * Preferences as one card (design canvas): language, appearance, notifications (which open the
 * list of kinds to turn on or off) and the sound for new orders. Appearance and sound also live
 * on this device, so the app looks and sounds right before the profile loads.
 */
export function PrefsSection({ onLanguage }: { onLanguage: () => void }) {
  const { t, i18n } = useTranslation();
  const [notifyOpen, setNotifyOpen] = useState(false);
  const { prefs, save } = useProfile();
  const appearance = useOwnerPrefs((state) => state.appearance);
  const setAppearance = useOwnerPrefs((state) => state.setAppearance);
  const chime = useOwnerPrefs((state) => state.chime);
  const setChime = useOwnerPrefs((state) => state.setChime);
  return (
    <View style={{ gap: tokens.space[4] }}>
      <Section title={t('ownerSettings.preferences')}>
        <LinkRow
          icon={Globe}
          label={t('ownerSettings.language')}
          value={languageByCode(i18n.language).label}
          onPress={onLanguage}
        />
        <InlineRow icon={SunMoon} label={t('ownerSettings.appearance')}>
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
        </InlineRow>
        <LinkRow
          icon={Bell}
          label={t('ownerSettings.notifyTitle')}
          onPress={() => setNotifyOpen((v) => !v)}
        />
        <InlineRow icon={Volume2} label={t('ownerSettings.chime')}>
          <Toggle
            value={chime}
            label={t('ownerSettings.chime')}
            onChange={(on) => {
              setChime(on);
              save.mutate({ prefs: { ...prefs, soundForNewOrders: on } });
            }}
          />
        </InlineRow>
      </Section>
      {notifyOpen ? (
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
      ) : null}
    </View>
  );
}
