import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { Text } from '@/ui/Text';
import { useProfile } from './useProfile';

/**
 * Who is signed in (design canvas): a card with their initial, name, role, location and masked
 * phone. "Edit profile" opens the Profile page.
 */
export function ProfileSection({ place }: { place?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { me } = useProfile();
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  if (!me.data) return null;
  const u = me.data;
  const masked = `${u.phone.slice(0, 4)} *** ${u.phone.slice(-4)}`;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  return (
    <View style={[cardStyle(theme), styles.summary]}>
      <View style={[styles.avatar, { backgroundColor: theme.tint }]}>
        <Text style={[styles.initial, { color: theme.badgeInk }]}>
          {u.firstName.slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={styles.who}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
          {[t(`ownerSettings.roles.${role}`), place, masked].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Button
        label={t('ownerSettings.editProfile')}
        tone="secondary"
        onPress={() => router.push('/owner/profile')}
        style={styles.short}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas profile card: 40 px initial, name 16, the rest 14 grey, "Edit profile" on the right.
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingVertical: 14,
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontSize: 16, lineHeight: 20, fontFamily: fontFamily.strong },
  who: { flex: 1, minWidth: 0, gap: 2 },
  name: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  short: { minHeight: 40 },
});
