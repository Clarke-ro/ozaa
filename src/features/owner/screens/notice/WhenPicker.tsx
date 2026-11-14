import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react-native';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { Chips, ModalSheet } from '../../kit';
import { dayOptions, timeOptions, whenLabel } from '../../desk/noticeForm';

const DAYS = 14;

/**
 * A start or end time, picked rather than typed (Clarke, 2026-11-14): the field shows
 * "Today, 18:00" and opens a sheet with the next two weeks and every half hour. The value stays
 * "YYYY-MM-DD HH:MM" in the venue's zone, so the saving rules don't change.
 */
export function WhenPicker({
  label,
  value,
  onChange,
  timeZone,
  error,
  defaultTime,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  timeZone: string;
  error?: string;
  /** The time a fresh pick starts on, e.g. 18:00 for Starts and 23:00 for Ends. */
  defaultTime: string;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  // The clock is read when the sheet opens, so "Today" is right even on a long-open page.
  const [now, setNow] = useState(() => Date.now());
  const days = dayOptions(now, timeZone, DAYS);
  const [day, setDay] = useState('');
  const [time, setTime] = useState('');
  const words = { today: t('ownerNotice.today'), tomorrow: t('ownerNotice.tomorrow') };
  const shown = whenLabel(value, now, timeZone, words, i18n.language);

  const start = () => {
    const at = Date.now();
    setNow(at);
    const first = dayOptions(at, timeZone, 1)[0] ?? '';
    setDay(value.slice(0, 10) || first);
    setTime(value.slice(11) || defaultTime);
    setOpen(true);
  };
  const dayName = (d: string, i: number) =>
    i === 0
      ? words.today
      : i === 1
        ? words.tomorrow
        : new Date(`${d}T12:00:00Z`).toLocaleDateString(
            i18n.language === 'en' ? 'en-GB' : i18n.language,
            { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' },
          );

  return (
    <View style={styles.wrap}>
      <Text variant="body-strong" style={[styles.label, { color: theme.muted }]}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${shown || t('ownerNotice.noTime')}`}
        onPress={start}
        style={({ pressed }) => [
          styles.pill,
          {
            borderColor: error ? theme.error : theme.line,
            backgroundColor: pressed ? theme.wash : theme.surface,
          },
        ]}
      >
        <Text
          variant="body"
          style={[styles.flex, !shown && { color: theme.meta }]}
          numberOfLines={1}
        >
          {shown || t('ownerNotice.noTime')}
        </Text>
        <CalendarClock size={18} color={theme.meta} />
      </Pressable>
      {error ? (
        <Text variant="caption" style={{ color: theme.error }}>
          {error}
        </Text>
      ) : null}
      <ModalSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={label}
        footer={
          <View style={styles.footer}>
            <Button
              label={t('ownerNotice.clear')}
              tone="secondary"
              onPress={() => {
                onChange('');
                setOpen(false);
              }}
              style={styles.grow}
            />
            <Button
              label={t('ownerNotice.done')}
              onPress={() => {
                onChange(`${day} ${time}`);
                setOpen(false);
              }}
              style={styles.grow}
            />
          </View>
        }
      >
        <Text variant="body-strong">{t('ownerNotice.day')}</Text>
        <Chips<string>
          single
          label={t('ownerNotice.day')}
          options={days.map((d, i) => ({ id: d, label: dayName(d, i) }))}
          selected={[day]}
          onChange={(ids) => ids[0] && setDay(ids[0])}
        />
        <Text variant="body-strong">{t('ownerNotice.time')}</Text>
        <Chips<string>
          single
          label={t('ownerNotice.time')}
          options={timeOptions().map((x) => ({ id: x, label: x }))}
          selected={[time]}
          onChange={(ids) => ids[0] && setTime(ids[0])}
        />
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: tokens.space[2] },
  label: { fontSize: 14, lineHeight: 20 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.owner.controls.height,
    paddingHorizontal: tokens.space[4],
    borderWidth: 1,
    borderRadius: tokens.radius.full,
  },
  flex: { flex: 1, fontFamily: fontFamily.regular },
  footer: { flexDirection: 'row', gap: tokens.space[3] },
  grow: { flex: 1 },
});
