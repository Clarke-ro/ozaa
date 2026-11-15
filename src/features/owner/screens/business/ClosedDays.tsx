import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { AddDashed, TitledSection, toast } from '../../kit';
import { ClosedDaySheet, type ClosedDayPick } from './ClosedDaySheet';
import { addClosedDay } from './hoursForm';

/**
 * Days that differ from the week (canvas), such as public holidays: shut all day, or open with
 * their own hours. Each shows its name and date; guests see them on the venue's hours.
 */
export function ClosedDays({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [bad, setBad] = useState(false);
  const list = venue.hours.exceptions ?? [];
  const save = useMutation({
    mutationFn: (exceptions: NonNullable<VenueSettings['hours']['exceptions']>) =>
      api.ownerUpdateVenue(venue.id, { hours: { ...venue.hours, exceptions } }),
    onSuccess: () => {
      setAdding(false);
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venue.id) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  // Dates are calendar days, so format them in UTC to stop a time zone moving them a day.
  const label = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(
      i18n.language === 'en' ? 'en-GB' : i18n.language,
      {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      },
    );
  const add = (pick: ClosedDayPick) => {
    const next = addClosedDay(list, pick.date, { name: pick.name, hours: pick.hours });
    if (!next) return setBad(true);
    setBad(false);
    save.mutate(next);
  };

  return (
    <View style={styles.stack}>
      <TitledSection title={t('ownerBusiness.closedDays')} cardStyle={styles.card}>
        {list.length === 0 ? (
          <Text variant="body" style={[styles.empty, { color: theme.muted }]}>
            {t('ownerBusiness.noClosedDays')}
          </Text>
        ) : null}
        {list.map((c, i) => (
          <View
            key={c.date}
            style={[styles.row, i > 0 && { borderTopWidth: 1, borderTopColor: theme.line }]}
          >
            <View style={styles.flex}>
              <Text variant="body">{c.name || label(c.date)}</Text>
              {c.name ? (
                <Text variant="caption" style={{ color: theme.muted }}>
                  {label(c.date)}
                </Text>
              ) : null}
            </View>
            <Text variant="body" style={{ color: c.closed ? theme.muted : theme.text }}>
              {c.closed || !c.opens || !c.closes
                ? t('ownerBusiness.closed')
                : t('ownerBusiness.hoursRange', { opens: c.opens, closes: c.closes })}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerBusiness.removeClosed', {
                date: c.name || label(c.date),
              })}
              onPress={() => save.mutate(list.filter((x) => x.date !== c.date))}
              hitSlop={8}
            >
              <X size={16} color={theme.meta} />
            </Pressable>
          </View>
        ))}
      </TitledSection>
      <AddDashed label={t('ownerBusiness.addClosed')} onPress={() => setAdding(true)} />
      {adding ? (
        <ClosedDaySheet
          visible
          saving={save.isPending}
          error={bad ? t('ownerBusiness.hoursError') : undefined}
          onClose={() => setAdding(false)}
          onAdd={add}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.listGap },
  card: { paddingVertical: 2, paddingHorizontal: tokens.owner.controls.cardPadding },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 60 },
  flex: { flex: 1, gap: 2 },
  empty: { paddingVertical: tokens.space[4] },
});
