import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react-native';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { useTheme } from '@/ui/theme';
import { cardStyle, Field, LinkRow, PhotoField, SectionLabel } from '../../kit';
import { PhoneSheet } from './PhoneSheet';
import { useProfile } from './useProfile';

/** Who is signed in: photo, name and email to edit, and the phone, changed only with a code. */
export function ProfileSection() {
  const theme = useTheme();
  const { t } = useTranslation();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const { me, save } = useProfile();
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  if (!me.data) return null;
  const u = me.data;
  const changed = first !== null || last !== null || email !== null;
  const masked = `${u.phone.slice(0, 4)} *** ${u.phone.slice(-4)}`;
  return (
    <View style={styles.group}>
      <SectionLabel title={t('ownerSettings.profile')} />
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
  group: { gap: tokens.space[3] },
  card: { padding: tokens.space[5], gap: tokens.space[4] },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  end: { alignItems: 'flex-end' },
});
