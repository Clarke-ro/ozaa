import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, Globe, LogOut, Trash2 } from 'lucide-react-native';
import { api } from '@/lib/api';
import { languageByCode } from '@/features/venue';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ConfirmDialog, LinkRow, Section, SectionBody } from '../../kit';
import { DeleteAccountSheet } from './DeleteAccountSheet';
import { LanguageSheet } from './LanguageSheet';

export function SettingsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const firstName = useOwnerSession((state) => state.firstName) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const venueId = useOwnerSession((state) => state.venueId);
  const clearOwner = useOwnerSession((state) => state.clearOwner);
  const business = useQuery({
    queryKey: ownerKeys.business(),
    queryFn: () => api.ownerGetBusiness(),
  });
  const location = business.data?.locations.find((l) => l.id === venueId);
  const [sheet, setSheet] = useState<'language' | 'signOut' | 'delete' | null>(null);

  const signOut = () => {
    clearOwner();
    setSheet(null);
    router.replace('/owner/login');
  };

  return (
    <OwnerPage title={t('owner.settings')}>
      <Section title={t('ownerSettings.profile')}>
        <SectionBody>
          <View style={styles.profile}>
            <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
              <Text variant="title" style={{ color: theme.badgeInk }}>
                {firstName.slice(0, 1).toUpperCase() || '?'}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text variant="body-strong">{firstName}</Text>
              <Text variant="caption" style={{ color: theme.muted }}>
                {t(`ownerSettings.roles.${role}`)}
              </Text>
            </View>
          </View>
        </SectionBody>
        <LinkRow
          icon={Building2}
          label={t('ownerSettings.location')}
          value={location?.name}
          onPress={() => router.push('/owner/business')}
        />
      </Section>

      <Section title={t('ownerSettings.preferences')} note={t('ownerSettings.appearanceNote')}>
        <LinkRow
          icon={Globe}
          label={t('ownerSettings.language')}
          value={languageByCode(i18n.language).label}
          onPress={() => setSheet('language')}
        />
      </Section>

      <Section title={t('ownerSettings.account')}>
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

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
});
