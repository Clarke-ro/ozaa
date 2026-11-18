import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Toggle } from '@/ui/Toggle';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CircleCheck } from 'lucide-react-native';
import { api } from '@/lib/api';
import { toMessageKey } from '@/lib/api/errors';
import { asGhanaPhone, parsePhone } from '@/lib/phone';
import { useVenue } from '@/features/venue';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { guestHomeHref, useGuestSession } from '@/features/session';

/**
 * A private note to the manager. A phone number is only sent if the guest switches it on
 * (Act 843: no personal data unless the guest chooses to give it).
 */
export function FeedbackScreen({ slug }: { slug: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  // Back to this guest's own home: their table, or the online menu.
  const tableCode = useGuestSession((state) => (state.slug === slug ? state.tableCode : null));
  const venue = useVenue(slug);
  const [message, setMessage] = useState('');
  const [share, setShare] = useState(false);
  const [phone, setPhone] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const parsed = asGhanaPhone(parsePhone(phone));
  const messageError = showErrors && !message.trim() ? t('simple.needMessage') : null;
  const phoneError = showErrors && share && !parsed ? t('simple.needPhone') : null;

  const send = useMutation({
    mutationFn: () =>
      api.sendFeedback({
        message: message.trim(),
        ...(share && parsed ? { contactPhone: parsed } : {}),
      }),
  });

  if (send.isSuccess) {
    return (
      <SafeScreen>
        <PageHeader title={t('services.feedback.title')} subtitle={venue.data?.name} />
        <View style={styles.done}>
          <CircleCheck size={48} color={theme.success} />
          <Text variant="title">{t('simple.sentTitle')}</Text>
          <Text variant="body" style={[styles.center, { color: theme.muted }]}>
            {share ? t('simple.sentCall') : t('simple.sent')}
          </Text>
          <Button
            label={t('review.backHome')}
            tone="secondary"
            onPress={() => router.replace(guestHomeHref(slug, tableCode))}
          />
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <PageHeader title={t('services.feedback.title')} subtitle={venue.data?.name} />
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text variant="body" style={{ color: theme.muted }}>
          {t('simple.feedbackLead')}
        </Text>
        <Text variant="body-strong">{t('simple.feedback')}</Text>
        <TextInput
          accessibilityLabel={t('simple.feedback')}
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={1000}
          placeholder={t('simple.feedbackHint')}
          placeholderTextColor={theme.meta}
          style={[
            styles.input,
            {
              borderColor: messageError ? theme.error : theme.line,
              color: theme.text,
              backgroundColor: theme.surface,
            },
          ]}
        />
        {messageError ? (
          <Text variant="caption" style={{ color: theme.error }}>
            {messageError}
          </Text>
        ) : null}
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <Text variant="body-strong">{t('simple.shareNumber')}</Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('simple.shareNumberHint')}
            </Text>
          </View>
          <Toggle value={share} onChange={setShare} label={t('simple.shareNumber')} />
        </View>
        {share ? (
          <>
            <TextInput
              accessibilityLabel={t('pay.phone')}
              placeholder={t('pay.phone')}
              placeholderTextColor={theme.meta}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              style={[
                styles.field,
                {
                  borderColor: phoneError ? theme.error : theme.line,
                  color: theme.text,
                  backgroundColor: theme.surface,
                },
              ]}
            />
            {phoneError ? (
              <Text variant="caption" style={{ color: theme.error }}>
                {phoneError}
              </Text>
            ) : null}
          </>
        ) : null}
        {send.isError ? (
          <Text variant="body" style={{ color: theme.error }}>
            {t(toMessageKey(send.error))}
          </Text>
        ) : null}
        <Button
          label={t('simple.send')}
          loading={send.isPending}
          onPress={() =>
            message.trim() && (!share || parsed) ? send.mutate() : setShowErrors(true)
          }
        />
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, gap: 12, paddingBottom: 48 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 140,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Inter_400',
    textAlignVertical: 'top',
  },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter_400',
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  flex: { flex: 1 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  center: { textAlign: 'center' },
});
