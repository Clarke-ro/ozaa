import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CircleHelp,
  Globe,
  LogOut,
  Smartphone,
  Trash2,
  Users,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { languageByCode } from '@/features/venue';
import { useOwnerSession } from '@/features/session';
import { OwnerPage } from '../../chrome/OwnerPage';
import { useSignOut } from '../../chrome/useSignOut';
import { ownerKeys } from '../../data/keys';
import { ConfirmDialog, LinkRow, Section } from '../../kit';
import { DeleteAccountSheet } from './DeleteAccountSheet';
import { PrefsSection } from './PrefsSection';
import { ProfileSection } from './ProfileSection';
import { LanguageSheet } from './LanguageSheet';

/** Who is signed in, the venue's people and devices, preferences, and the account. */
export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const venueId = useOwnerSession((state) => state.venueId);
  const endSession = useSignOut();
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const location = business.data?.locations.find((l) => l.id === venueId);
  const [sheet, setSheet] = useState<'language' | 'signOut' | 'delete' | null>(null);

  const signOut = () => {
    setSheet(null);
    endSession();
  };

  const accountSections = (
    <>
      <Section title={t('ownerSettings.account')}>
        {/* Help and sign out used to sit under the sidebar; the owner button leads here now. */}
        <LinkRow
          icon={CircleHelp}
          label={t('ownerChrome.help')}
          onPress={() => router.push('/owner/help')}
        />
        <LinkRow
          icon={LogOut}
          label={t('ownerSettings.signOut')}
          onPress={() => setSheet('signOut')}
        />
      </Section>
      <Section>
        <LinkRow
          icon={Trash2}
          label={t('ownerSettings.delete')}
          destructive
          onPress={() => setSheet('delete')}
        />
      </Section>
    </>
  );

  const mainSections = (
    <>
      <Section title={t('ownerSettings.venue')}>
        <LinkRow
          icon={Building2}
          label={t('ownerSettings.location')}
          value={location?.name}
          onPress={() => router.push('/owner/business')}
        />
        {role === 'owner' || role === 'manager' ? (
          <>
            <LinkRow
              icon={Users}
              label={t('owner.staff')}
              onPress={() => router.push('/owner/staff')}
            />
            <LinkRow
              icon={Smartphone}
              label={t('owner.devices')}
              onPress={() => router.push('/owner/devices')}
            />
          </>
        ) : null}
      </Section>

      <Section title={t('ownerSettings.preferences')}>
        <LinkRow
          icon={Globe}
          label={t('ownerSettings.language')}
          value={languageByCode(i18n.language).label}
          onPress={() => setSheet('language')}
        />
      </Section>
    </>
  );

  return (
    <OwnerPage title={t('owner.settings')} subtitle={t('ownerLead.settings')}>
      <ProfileSection />
      {mainSections}
      <PrefsSection />
      {accountSections}

      <LanguageSheet visible={sheet === 'language'} onClose={() => setSheet(null)} />
      <ConfirmDialog
        visible={sheet === 'signOut'}
        title={t('ownerSettings.signOutTitle')}
        message={t('ownerSettings.signOutBody')}
        confirmLabel={t('ownerSettings.signOut')}
        onConfirm={signOut}
        onCancel={() => setSheet(null)}
      />
      <DeleteAccountSheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        onDeleted={signOut}
      />
    </OwnerPage>
  );
}
