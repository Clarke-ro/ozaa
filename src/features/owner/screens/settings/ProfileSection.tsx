import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle, Field, LinkRow, PhotoField } from '../../kit';
import { Text } from '@/ui/Text';
import { PhoneSheet } from './PhoneSheet';
import { useProfile } from './useProfile';

/**
 * Who is signed in (design canvas): a card with their initial, name, role, location and masked
 * phone, and "Edit profile". Editing opens the photo, name and email fields under it, and the
 * phone row, which changes only with a code.
 */
export function ProfileSection({ place }: { place?: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { me, save } = useProfile();
  const role = useOwnerSession((state) => state.role) ?? 'owner';
  const [editing, setEditing] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  if (!me.data) return null;
  const u = me.data;
  const changed = first !== null || last !== null || email !== null;
  const masked = `${u.phone.slice(0, 4)} *** ${u.phone.slice(-4)}`;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
  const summary = (
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
        label={editing ? t('ownerSettings.doneEditing') : t('ownerSettings.editProfile')}
        tone="secondary"
        onPress={() => setEditing((v) => !v)}
        style={styles.short}
      />
    </View>
  );
  if (!editing) return summary;
  return (
    <View style={styles.group}>
      {summary}
      <View style={[cardStyle(theme), styles.card]}>
        <PhotoField
          venueId={venueId}
          kind="logo"
          label={t('ownerSettings.photo')}
          url={u.photo?.url ?? null}
          onChange={(mediaId) => save.mutate({ photoMediaId: mediaId })}
        />
        <View style={styles.row}>
          <Field
            label={t('ownerSettings.firstName')}
            value={first ?? u.firstName}
            onChangeText={setFirst}
          />
          <Field
            label={t('ownerSettings.lastName')}
            value={last ?? u.lastName ?? ''}
            onChangeText={setLast}
          />
        </View>
        <Field
          label={t('ownerSettings.email')}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email ?? u.email ?? ''}
          onChangeText={setEmail}
        />
        {changed ? (
          <View style={styles.end}>
            <Button
              label={t('ownerSettings.saveProfile')}
              size="md"
              loading={save.isPending}
              onPress={() =>
                save.mutate(
                  {
                    ...(first !== null ? { firstName: first.trim() } : {}),
                    ...(last !== null ? { lastName: last.trim() || null } : {}),
                    ...(email !== null ? { email: email.trim() || null } : {}),
                  },
                  {
                    onSuccess: () => {
                      setFirst(null);
                      setLast(null);
                      setEmail(null);
                    },
                  },
                )
              }
            />
          </View>
        ) : null}
      </View>
      <LinkRow
        icon={Phone}
        label={t('ownerSettings.phone')}
        value={masked}
        onPress={() => setPhoneOpen(true)}
      />
      <PhoneSheet visible={phoneOpen} onClose={() => setPhoneOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: tokens.owner.controls.listGap },
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
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  end: { alignItems: 'flex-end' },
});
