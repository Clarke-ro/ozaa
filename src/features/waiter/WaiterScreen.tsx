import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRetryKey } from '@/lib/retryKey';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { OfflineNote } from '@/ui/OfflineNote';
import { Check } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { WaiterReason } from '@/lib/api/types';
import { hapticSuccess } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { PageHeader } from '@/ui/PageHeader';
import { SafeScreen } from '@/ui/Screen';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { useGuestSession, useMyCalls } from '@/features/session';
import { useVenue } from '@/features/venue';
import { CallStatusCard } from './CallStatusCard';
import { REASON_ICON, REASONS } from './reasonIcon';
import { useNow } from '@/lib/useNow';

// The note travels with the call to the waiter's phone; keep it to a line or two.
const NOTE_MAX = 140;
// "Waiting 2 minutes" only needs to move every half minute.
const TICK_MS = 30_000;

/**
 * Call a waiter: pick what you need (one or more), add a note if you like, send. The request
 * shows its live status here: waiting, who is on the way, then done.
 */
export function WaiterScreen({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const venue = useVenue(slug);
  const table = useGuestSession((state) => state.tableCode);
  const myCalls = useMyCalls((s) => s.ids);
  const remember = useMyCalls((s) => s.add);
  const [picked, setPicked] = useState<WaiterReason[]>([]);
  const [note, setNote] = useState('');
  const now = useNow(TICK_MS);

  // One open call per table (BUILD.md 1.10): the first reason is the call, the others ride in
  // its note so the waiter sees everything the table asked for in one place.
  const keyFor = useRetryKey();
  const send = useMutation({
    mutationFn: (reasons: WaiterReason[]) => {
      const [first, ...more] = reasons;
      const parts = [
        more.length
          ? t('waiter.also', { list: more.map((r) => t(`waiter.reasons.${r}`)).join(', ') })
          : null,
        note.trim() || null,
      ].filter(Boolean);
      const body = { reason: first ?? 'other', note: parts.length ? parts.join(' · ') : undefined };
      // Retrying the same call reuses its key, so a lost reply never rings the waiter twice.
      return api.callWaiter(body, { idempotencyKey: keyFor(body) });
    },
    onSuccess: (row) => {
      void hapticSuccess();
      remember([row.id]);
      setPicked([]);
      setNote('');
    },
  });

  const toggle = (reason: WaiterReason) =>
    setPicked((current) =>
      current.includes(reason) ? current.filter((r) => r !== reason) : [...current, reason],
    );

  return (
    <SafeScreen>
      <PageHeader
        title={t('waiter.title')}
        subtitle={table ? t('home.table', { code: table }) : (venue.data?.name ?? '')}
      />
      <OfflineNote sending />
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
        {myCalls.length > 0 ? (
          <View style={styles.block}>
            <Text variant="title">{t('waiter.yourRequests')}</Text>
            {myCalls.map((id) => (
              <CallStatusCard key={id} id={id} now={now} />
            ))}
          </View>
        ) : null}

        <View style={styles.block}>
          <Text variant="title">
            {myCalls.length > 0 ? t('waiter.somethingElse') : t('waiter.prompt')}
          </Text>
          <Text variant="body" style={{ color: theme.muted }}>
            {t('waiter.lead')}
          </Text>
          {REASONS.map((reason) => {
            const on = picked.includes(reason);
            const Icon = REASON_ICON[reason];
            return (
              <Pressable
                key={reason}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on }}
                accessibilityLabel={t(`waiter.reasons.${reason}`)}
                onPress={() => toggle(reason)}
                style={({ pressed }) => [
                  styles.reason,
                  {
                    backgroundColor: on ? theme.tint : pressed ? theme.wash : theme.surface,
                    borderColor: on ? theme.ink : theme.surface,
                  },
                ]}
              >
                <Icon size={24} color={theme.ink} strokeWidth={2} />
                <Text variant="body-strong" style={styles.flex}>
                  {t(`waiter.reasons.${reason}`)}
                </Text>
                {on ? <Check size={20} color={theme.ink} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
          <TextInput
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX}
            placeholder={t('waiter.note')}
            placeholderTextColor={theme.meta}
            accessibilityLabel={t('waiter.note')}
            multiline
            style={[
              styles.note,
              { color: theme.text, borderColor: theme.line, backgroundColor: theme.surface },
            ]}
          />
          <Button
            label={t('waiter.send')}
            disabled={picked.length === 0}
            loading={send.isPending}
            onPress={() => send.mutate(picked)}
          />
          {send.isError ? (
            <Text variant="caption" style={{ color: theme.error }}>
              {t('waiter.failed')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  page: {
    padding: tokens.grid.mobile.margin,
    gap: tokens.space[8],
    paddingBottom: tokens.space[16],
  },
  block: { gap: tokens.space[3] },
  reason: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[4],
    minHeight: 60,
    paddingHorizontal: tokens.space[5],
    borderWidth: 1.5,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    boxShadow: tokens.shadow.card,
  },
  flex: { flex: 1 },
  note: {
    minHeight: 72,
    padding: tokens.space[3],
    borderWidth: 1,
    borderRadius: tokens.radius.md,
    fontFamily: fontFamily.regular,
    fontSize: tokens.type.body.size,
    textAlignVertical: 'top',
  },
});
