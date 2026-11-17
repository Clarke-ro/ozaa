import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FloorTable } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { STATUS_LABEL } from './floorLook';

// A kitchen ticket is late past 10 minutes (desk/ops ticketAge), so the minutes turn red.
const LATE_MINUTES = 10;

/** What the card says about a table with an order: where that order is in the kitchen. */
const ORDER_WORD: Record<string, { key: string; tone: StatusTone | null }> = {
  received: { key: 'ownerFloor.stage.received', tone: 'order' },
  accepted: { key: 'ownerFloor.stage.accepted', tone: 'order' },
  preparing: { key: 'ownerFloor.stage.preparing', tone: 'info' },
  ready: { key: 'ownerFloor.stage.ready', tone: 'success' },
  served: { key: 'ownerFloor.stage.served', tone: null },
};

/**
 * A table someone is sitting at, as on the design canvas: its name and bill on top, then at the
 * bottom what is going on in the table's colour ("Cooking", "Needs a waiter") with a grey line
 * under it, and the one thing to do as a tinted button when the table needs someone.
 */
export function FloorCard({
  table,
  minutes,
  currency,
  selected,
  onPress,
  quick,
}: {
  table: FloorTable;
  /** Minutes since the call or the order, or null with neither. */
  minutes: number | null;
  currency: string;
  selected: boolean;
  onPress: () => void;
  quick?: { label: string; busy: boolean; onPress: () => void; tint: StatusTone };
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const tones = STATUS_TONES[theme.scheme];
  const name = table.label ?? t('ownerFloor.tableName', { name: table.code });
  const bill = table.billPesewas ? formatMoney(pesewas(table.billPesewas), currency) : null;
  const mins = minutes != null ? t('ownerCalls.minutes', { count: minutes }) : null;

  let word = t(STATUS_LABEL[table.status]);
  let wordInk = theme.muted;
  let sub: string | null = null;
  let late = false;
  if (table.status === 'needs_waiter') {
    wordInk = tones.alert.line;
    const reason = table.waiterReason ? t(`ownerFloor.askedFor.${table.waiterReason}`) : null;
    sub = [reason, mins].filter(Boolean).join(' · ');
  } else if (table.status === 'waiting_to_pay') {
    wordInk = tones.bill.line;
    sub =
      table.orderNumber != null ? t('ownerFloor.orderNumber', { number: table.orderNumber }) : null;
  } else if (table.status === 'ordered' && table.orderStatus) {
    const stage = ORDER_WORD[table.orderStatus];
    if (stage) {
      word = t(stage.key);
      wordInk = stage.tone ? tones[stage.tone].line : theme.muted;
    }
    sub = [
      table.orderNumber != null ? t('ownerFloor.orderNumber', { number: table.orderNumber }) : null,
      mins,
    ]
      .filter(Boolean)
      .join(' · ');
    late = table.orderStatus === 'preparing' && minutes != null && minutes >= LATE_MINUTES;
  } else if (table.status === 'seated') {
    sub = t('ownerFloor.noOrder');
  }

  return (
    <View style={[cardStyle(theme), styles.card, selected && { borderColor: theme.text }]}>
      <Pressable
        accessibilityRole="button"
        aria-selected={selected}
        accessibilityLabel={[name, word, bill].filter(Boolean).join(', ')}
        onPress={onPress}
        style={({ pressed, hovered }) => [styles.body, (pressed || hovered) && { opacity: 0.7 }]}
      >
        <View style={styles.top}>
          <Text style={[styles.name, styles.flex]} numberOfLines={1}>
            {name}
          </Text>
          {bill ? <Text style={[styles.name, styles.num]}>{bill}</Text> : null}
        </View>
        <View style={styles.state}>
          <Text style={[styles.word, { color: wordInk }]} numberOfLines={1}>
            {word}
          </Text>
          {sub ? (
            <Text
              style={[styles.sub, { color: late ? tones.alert.line : theme.meta }]}
              numberOfLines={1}
            >
              {sub}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {quick ? (
        <Button
          label={quick.label}
          tone="tinted"
          tint={quick.tint}
          loading={quick.busy}
          onPress={quick.onPress}
          style={styles.quick}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas table card: at least 150 px, 20 px padding, the status pushed to the bottom.
  card: {
    flex: 1,
    minHeight: 150,
    padding: tokens.owner.controls.cardPadding,
    gap: 14,
  },
  body: { flex: 1, gap: 14 },
  // Phones put two tables in a row, about 110 px each: the bill drops under the name instead of
  // cutting it to "Tabl…". On wider cards both still fit on one line.
  top: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: tokens.space[3],
    rowGap: 2,
  },
  flex: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  name: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  num: { fontVariant: ['tabular-nums'] },
  state: { marginTop: 'auto', gap: 2 },
  word: { fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  quick: { minHeight: 44 },
});
