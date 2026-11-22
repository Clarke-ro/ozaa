import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { languageByCode } from '@/features/venue';
import { useOwnerSession } from '@/features/session';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { DeskWait, OwnerPage } from '../../chrome/OwnerPage';
import { useSignOut } from '../../chrome/useSignOut';
import { Field, TitledSection } from '../../kit';
import { DeleteAccountSheet } from '../settings/DeleteAccountSheet';
import { LanguageSheet } from '../settings/LanguageSheet';
import { PhoneSheet } from '../settings/PhoneSheet';
import { useProfile } from '../settings/useProfile';
import { ProfilePhoto } from './ProfilePhoto';
import { splitName } from './splitName';

/**
 * Your profile (canvas): photo, details, language and delete account. The contract keeps first
 * and last name apart; the canvas shows one Name field, so it is split at the first space.
 * The phone changes only with a texted code, so its field opens that sheet.
 */
export function ProfileScreen() {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const venueId = useOwnerSession((state) => state.venueId) ?? '';
  const endSession = useSignOut();
  const { me, save } = useProfile();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'phone' | 'language' | 'delete' | null>(null);
  const u = me.data;
  const fullName = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : '';
  const changed = name !== null || email !== null;

  const submit = () => {
    if (!changed) return;
    const parts = name !== null ? splitName(name) : null;
    if (parts && !parts.firstName) return;
    save.mutate(
      { ...(parts ?? {}), ...(email !== null ? { email: email.trim() || null } : {}) },
      {
        onSuccess: () => {
          setName(null);
          setEmail(null);
        },
      },
    );
  };

  return (
    <OwnerPage
      title={t('ownerProfile.title')}
      subtitle={t('ownerProfile.lead')}
      back={{ label: t('owner.settings'), onPress: () => router.push('/owner/settings') }}
    >
      <DeskWait loading={me.isPending} error={me.isError} onRetry={() => void me.refetch()}>
        {u ? (
          <View style={styles.stack}>
            <ProfilePhoto
              venueId={venueId}
              url={u.photo?.url ?? null}
              initial={u.firstName.slice(0, 1).toUpperCase()}
              onChange={(mediaId) => save.mutate({ photoMediaId: mediaId })}
            />
            <TitledSection title={t('ownerProfile.details')} cardStyle={styles.card}>
              <View style={styles.row}>
                <View style={styles.half}>
                  <Field
                    label={t('ownerProfile.name')}
                    value={name ?? fullName}
                    onChangeText={setName}
                    autoComplete="name"
                  />
                </View>
                <View style={styles.half}>
                  <Text variant="body-strong" style={[styles.label, { color: theme.muted }]}>
                    {t('ownerSettings.phone')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('ownerSettings.changePhone')}
                    onPress={() => setSheet('phone')}
                    style={[
                      styles.pill,
                      { borderColor: theme.line, backgroundColor: theme.surface },
                    ]}
                  >
                    {/* Masked: a phone number never shows in full on screen (Act 843). */}
                    <Text variant="body">{`${u.phone.slice(0, 4)} *** ${u.phone.slice(-4)}`}</Text>
                  </Pressable>
                  <Text variant="caption" style={{ color: theme.muted }}>
                    {t('ownerProfile.phoneHint')}
                  </Text>
                </View>
              </View>
              <Field
                label={t('ownerSettings.email')}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="you@example.com"
                value={email ?? u.email ?? ''}
                onChangeText={setEmail}
              />
            </TitledSection>
            <TitledSection title={t('ownerSettings.language')} cardStyle={styles.bare}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSheet('language')}
                style={[styles.card, styles.tight]}
              >
                <Text variant="body">{languageByCode(i18n.language).label}</Text>
                <Text variant="caption" style={{ color: theme.muted }}>
                  {t('ownerProfile.moreLanguages')}
                </Text>
              </Pressable>
            </TitledSection>
            <TitledSection title={t('ownerSettings.delete')} cardStyle={styles.bare}>
              <View style={[styles.card, styles.deleteRow]}>
                <Text variant="body" style={styles.flex}>
                  {t('ownerProfile.deleteBody')}
                </Text>
                <Button
                  label={t('ownerSettings.delete')}
                  tone="secondary"
                  labelColor={theme.error}
                  onPress={() => setSheet('delete')}
                  style={styles.short}
                />
              </View>
            </TitledSection>
            <View style={styles.end}>
              <Button
                label={t('ownerSettings.saveProfile')}
                loading={save.isPending}
                onPress={submit}
                style={styles.short}
              />
            </View>
          </View>
        ) : null}
      </DeskWait>
      <PhoneSheet visible={sheet === 'phone'} onClose={() => setSheet(null)} />
      <LanguageSheet visible={sheet === 'language'} onClose={() => setSheet(null)} />
      <DeleteAccountSheet
        visible={sheet === 'delete'}
        onClose={() => setSheet(null)}
        onDeleted={() => {
          setSheet(null);
          endSession();
        }}
      />
    </OwnerPage>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.sectionGap },
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  tight: { gap: 2 },
  bare: { padding: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space[3] },
  half: { flexGrow: 1, flexBasis: 240, gap: tokens.space[2] },
  label: { fontSize: 14, lineHeight: 20 },
  pill: {
    minHeight: tokens.owner.controls.height,
    justifyContent: 'center',
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  deleteRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1, minWidth: 220 },
  short: { minHeight: 40 },
  end: { alignItems: 'flex-end' },
});
