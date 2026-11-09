import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { FloorTable } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { FLOOR_TONES } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { STATUS_LABEL, TONE_OF } from './floorLook';
import { TONE_ICON } from './toneIcon';

const SELECTED_BORDER = 2;

/**
 * A table someone is sitting at: its code and bill, the status word, where the order is in the
 * kitchen and how long ago it came in, and, when the table needs someone, the one thing to do
 * about it ("On my way" for a call, "Mark paid" for a bill) right on the card. The rest of the
 * table opens beside the room (desktop) or in a sheet.
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
  /** Minutes since the table's order came in, or null with no order. */
  minutes: number | null;
  currency: string;
  selected: boolean;
  onPress: () => void;
  quick?: { label: string; busy: boolean; onPress: () => void };
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const tone = TONE_OF[table.status];
  const look = FLOOR_TONES[theme.scheme][tone];
  const Icon = TONE_ICON[tone];
  const word = t(STATUS_LABEL[table.status]);
  const bill = table.billPesewas ? formatMoney(pesewas(table.billPesewas), currency) : null;
  const order = [
    table.orderNumber != null ? t('ownerFloor.orderNumber', { number: table.orderNumber }) : null,
    table.orderStatus ? t(`statusLabel.${table.orderStatus}`) : null,
    minutes != null ? t('ownerCalls.minutes', { count: minutes }) : null,
  ].filter(Boolean);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: hovered ? theme.wash : theme.surface,
          borderColor: selected ? theme.text : theme.line,
        },
        selected && styles.selected,
      ]}
    >
      {/* The status colour is an edge, not the whole card: calm to scan, still quick to read. */}
      <View style={[styles.edge, { backgroundColor: look.edge }]} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={[table.label ?? t('ownerFloor.tableName', { name: table.code }), word, bill]
          .filter(Boolean)
          .join(', ')}
        onPress={onPress}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={styles.body}
      >
        <View style={styles.top}>
          <Text variant="display-m" numberOfLines={1} style={styles.flex}>
            {table.code}
          </Text>
          {bill ? (
            <Text variant="body-strong" style={styles.num}>
              {bill}
            </Text>
          ) : null}
        </View>
        <View style={styles.state}>
          <Icon size={16} color={look.ink} strokeWidth={2.4} />
          <Text variant="caption" numberOfLines={1} style={[styles.word, { color: look.ink }]}>
            {word}
          </Text>
        </View>
        {order.length > 0 ? (
          <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
            {order.join(' · ')}
          </Text>
        ) : null}
      </Pressable>
      {quick ? (
        <View style={styles.quick}>
          <Button
            label={quick.label}
            size="md"
            tone="secondary"
            loading={quick.busy}
            onPress={quick.onPress}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  selected: { borderWidth: SELECTED_BORDER },
  edge: { position: 'absolute', left: 0, top: 0, bottom: 0, width: tokens.owner.statusEdge },
  body: {
    flex: 1,
    gap: tokens.space[1],
    padding: tokens.space[3],
    paddingLeft: tokens.space[3] + tokens.owner.statusEdge,
  },
  top: { flexDirection: 'row', alignItems: 'baseline', gap: tokens.space[2] },
  flex: { flex: 1 },
  num: { fontVariant: ['tabular-nums'] },
  state: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  word: { fontFamily: fontFamily.strong, flexShrink: 1 },
  quick: {
    flexDirection: 'row',
    paddingLeft: tokens.space[3] + tokens.owner.statusEdge,
    paddingRight: tokens.space[3],
    paddingBottom: tokens.space[3],
  },
});
