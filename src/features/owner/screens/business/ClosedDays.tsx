import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';
import { api } from '@/lib/api';
import type { VenueSettings } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { ownerKeys } from '../../data/keys';
import { AddDashed, Field, ModalSheet, TitledSection, toast } from '../../kit';
import { addClosedDay } from './hoursForm';

/** Days the venue is shut outside its week, such as public holidays. Guests see them as closed. */
export function ClosedDays({ venue }: { venue: VenueSettings }) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const client = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState('');
  const [bad, setBad] = useState(false);
  const list = (venue.hours.exceptions ?? []).filter((c) => c.closed);
  const save = useMutation({
    mutationFn: (exceptions: NonNullable<VenueSettings['hours']['exceptions']>) =>
      api.ownerUpdateVenue(venue.id, { hours: { ...venue.hours, exceptions } }),
    onSuccess: () => {
      setAdding(false);
      setDate('');
      void client.invalidateQueries({ queryKey: ownerKeys.venue(venue.id) });
    },
    onError: () => toast.error(t('ownerKit.saveFailed')),
  });
  // Dates are calendar days, so format them in UTC to stop a time zone moving them a day.
  const label = (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  const add = () => {
    const next = addClosedDay(venue.hours.exceptions ?? [], date.trim());
    if (!next) return setBad(true);
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
            <Text variant="body" style={styles.flex}>
              {label(c.date)}
            </Text>
            <Text variant="caption" style={{ color: theme.muted }}>
              {t('ownerBusiness.closed')}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('ownerBusiness.removeClosed', { date: label(c.date) })}
              onPress={() =>
                save.mutate((venue.hours.exceptions ?? []).filter((x) => x.date !== c.date))
              }
              hitSlop={8}
            >
              <X size={16} color={theme.meta} />
            </Pressable>
          </View>
        ))}
      </TitledSection>
      <AddDashed label={t('ownerBusiness.addClosed')} onPress={() => setAdding(true)} />
      <ModalSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={t('ownerBusiness.addClosed')}
      >
        <Field
          label={t('ownerBusiness.closedDate')}
          placeholder="2026-12-25"
          value={date}
          onChangeText={(text) => {
            setDate(text);
            setBad(false);
          }}
          error={bad ? t('ownerBusiness.dateError') : undefined}
        />
        <Button label={t('ownerBusiness.addClosed')} loading={save.isPending} onPress={add} />
      </ModalSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: tokens.owner.controls.listGap },
  card: { paddingVertical: 2, paddingHorizontal: tokens.space[4] },
  row: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3], minHeight: 52 },
  flex: { flex: 1 },
  empty: { paddingVertical: tokens.space[4] },
});
