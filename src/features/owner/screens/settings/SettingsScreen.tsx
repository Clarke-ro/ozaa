import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, CircleHelp, LogOut, Smartphone, Trash2, Users } from 'lucide-react-native';
import { api } from '@/lib/api';
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
  const { t } = useTranslation();
  const router = useRouter();
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const venueId = useOwnerSession((state) => state.venueId);
  const endSession = useSignOut();
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const location = business.data?.locations.find((l) => l.id === venueId);
  const desk = role === 'owner' || role === 'manager';
  // The counts beside Staff and Scanner devices (canvas): "3 people", "1 phone".
  const staff = useQuery({
    queryKey: ownerKeys.staff(venueId ?? ''),
    queryFn: () => api.ownerListStaff(venueId ?? ''),
    enabled: Boolean(venueId) && desk,
  });
  const devices = useQuery({
    queryKey: ownerKeys.devices(venueId ?? ''),
    queryFn: () => api.ownerListScannerDevices(venueId ?? ''),
    enabled: Boolean(venueId) && desk,
  });
  const staffCount = (staff.data?.items ?? []).filter((m) => m.status !== 'removed').length;
  const deviceCount = devices.data?.items.length ?? 0;
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
        {desk ? (
          <>
            <LinkRow
              icon={Users}
              label={t('owner.staff')}
              value={staff.data ? t('ownerStaff.team', { count: staffCount }) : undefined}
              onPress={() => router.push('/owner/staff')}
            />
            <LinkRow
              icon={Smartphone}
              label={t('owner.devices')}
              value={
                devices.data ? t('ownerSettings.devicesCount', { count: deviceCount }) : undefined
              }
              onPress={() => router.push('/owner/devices')}
            />
          </>
        ) : null}
      </Section>
    </>
  );

  return (
    <OwnerPage title={t('owner.settings')} subtitle={t('ownerLead.settings')}>
      <ProfileSection place={location?.name} />
      {mainSections}
      <PrefsSection onLanguage={() => setSheet('language')} />
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
