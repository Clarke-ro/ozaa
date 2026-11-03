import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  BellDot,
  Building2,
  Globe,
  LogOut,
  Smartphone,
  SunMoon,
  Trash2,
  UserRound,
  Users,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { isOwnerQuery } from '@/lib/queryPersist';
import { languageByCode } from '@/features/venue';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { OwnerPage } from '../../chrome/OwnerPage';
import { ownerKeys } from '../../data/keys';
import { ConfirmDialog, InfoRow, LinkRow, Section, StatusPill } from '../../kit';
import { DeleteAccountSheet } from './DeleteAccountSheet';
import { LanguageSheet } from './LanguageSheet';

/** Who is signed in, the venue's people and devices, preferences, and the account. */
export function SettingsScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const firstName = useOwnerSession((state) => state.firstName) ?? '';
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const venueId = useOwnerSession((state) => state.venueId);
  const clearOwner = useOwnerSession((state) => state.clearOwner);
  const client = useQueryClient();
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
    // Drop this account's orders, customers and payouts so the next person to sign in on this
    // device never sees them, not even for a moment.
    client.removeQueries({ predicate: (query) => isOwnerQuery(query.queryKey) });
  };

  return (
    <OwnerPage title={t('owner.settings')}>
      {/* Who is signed in, and where. */}
      <View style={[styles.profile, { backgroundColor: theme.surface, borderColor: theme.line }]}>
        <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
          {firstName ? (
            <Text variant="display-m" style={{ color: theme.badgeInk }}>
              {firstName.slice(0, 1).toUpperCase()}
            </Text>
          ) : (
            <UserRound size={28} color={theme.badgeInk} />
          )}
        </View>
        <Text variant="title">{firstName}</Text>
        <View style={styles.center}>
          <StatusPill label={t(`ownerSettings.roles.${role}`)} tone="neutral" icon={false} />
        </View>
        {location ? (
          <Text variant="caption" style={{ color: theme.muted }}>
            {location.name}
          </Text>
        ) : null}
      </View>

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
        <InfoRow
          icon={SunMoon}
          label={t('ownerSettings.appearance')}
          value={t('ownerSettings.appearanceValue')}
        />
        <LinkRow
          icon={BellDot}
          label={t('owner.notifications')}
          onPress={() => router.push('/owner/notifications')}
        />
      </Section>

      <Section title={t('ownerSettings.account')}>
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
  center: { alignItems: 'center' },
  profile: {
    alignItems: 'center',
    gap: tokens.space[2],
    paddingVertical: tokens.space[6],
    paddingHorizontal: tokens.space[4],
    boxShadow: tokens.shadow.card,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
