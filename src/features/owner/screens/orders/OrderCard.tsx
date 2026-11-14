import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { ticketAge } from '../../desk/ops';
import { orderPlace, paidLabel, waitedLabel } from './orderPlace';

// Enough dishes to cook from at a glance; the rest are one tap away on the order's page.
// Phones show two, so each stage fits a couple of tickets on one screen.
const PREVIEW_LINES = 4;
const PREVIEW_LINES_PHONE = 2;

/** The next step's button takes the colour of the stage it moves the ticket out of (canvas). */
const NEXT_TINT: Record<Order['status'], StatusTone> = {
  received: 'order',
  preparing: 'info',
  ready: 'success',
  served: 'success',
  cancelled: 'alert',
};

/**
 * One ticket, as on the design canvas: where it goes and how long it has waited, the dishes with
 * their quantity on the right, the total and whether it is paid, then the next step as a tinted
 * button and "Mark paid" beside it. The top of the card opens the full order.
 */
export function OrderCard({
  order,
  currency,
  now,
  next,
  busy,
  onNext,
  onOpen,
  onMarkPaid,
  compact,
}: {
  order: Order;
  currency: string;
  now: number;
  /** The label of the next step for this role, or null when there is none. */
  next: string | null;
  busy: boolean;
  onNext: () => void;
  onOpen: () => void;
  /** Set for staff who may mark orders paid; shown on unpaid tickets only. */
  onMarkPaid?: () => void;
  /** Phones: 16 px padding, tighter gaps and fewer dish lines than the canvas card. */
  compact?: boolean;
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const live = order.status !== 'served' && order.status !== 'cancelled';
  const age = ticketAge(order.createdAt, now);
  const { where } = orderPlace(order, t);
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const shown = order.lines.slice(0, compact ? PREVIEW_LINES_PHONE : PREVIEW_LINES);
  const hidden = order.lines.length - shown.length;
  // As on the canvas, "Mark paid" sits beside the first step only; later it lives on the order page.
  const canMarkPaid = onMarkPaid && order.paymentStatus !== 'paid' && order.status === 'received';
  const tones = STATUS_TONES[theme.scheme];
  // Amber past 10 minutes, red past 20 (ticketAge); otherwise a quiet grey.
  const ageInk =
    age.tone === 'very_late' ? tones.alert.line : age.tone === 'late' ? tones.bill.line : null;
  const paid = order.paymentStatus === 'paid';

  return (
    <View style={[cardStyle(theme), styles.card, compact && styles.compact]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${where}, #${order.number}`}
        accessibilityHint={t('ownerOrders.openHint')}
        onPress={onOpen}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          styles.top,
          compact && styles.compactTop,
          (pressed || hovered) && { opacity: 0.7 },
        ]}
      >
        <View style={styles.head}>
          <View style={styles.flex}>
            <Text style={styles.where} numberOfLines={1}>
              {where}
            </Text>
            <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={1}>
              #{order.number} · {time}
            </Text>
          </View>
          {live ? (
            <Text
              accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}
              style={[
                styles.sub,
                ageInk ? { color: ageInk, fontFamily: fontFamily.strong } : { color: theme.meta },
              ]}
            >
              {waitedLabel(age.minutes, t)}
            </Text>
          ) : (
            <Text style={[styles.sub, { color: theme.meta }]}>
              {t(`statusLabel.${order.status}`)}
            </Text>
          )}
        </View>

        <View style={styles.lines}>
          {shown.map((line) => {
            const extra = [...(line.modifiers ?? []).map((m) => m.name), line.note]
              .filter(Boolean)
              .join(' · ');
            return (
              <View key={line.id} style={styles.line}>
                <View style={styles.flex}>
                  <Text style={styles.dish} numberOfLines={1}>
                    {line.name}
                  </Text>
                  {extra ? (
                    <Text style={[styles.sub, { color: theme.meta }]} numberOfLines={2}>
                      {extra}
                    </Text>
                  ) : null}
                </View>
                <Text style={[styles.dish, styles.qty]}>{line.quantity}×</Text>
              </View>
            );
          })}
          {hidden > 0 ? (
            <Text style={[styles.sub, { color: theme.meta }]}>
              {t('ownerOrders.moreDishes', { count: hidden })}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.sum, { borderTopColor: theme.wash }]}>
        <Text style={[styles.where, styles.num]}>
          {formatMoney(pesewas(order.totalPesewas), currency)}
        </Text>
        <Text
          style={[
            styles.sub,
            paid ? { color: theme.success, fontFamily: fontFamily.strong } : { color: theme.meta },
          ]}
        >
          {paidLabel(order, t)}
        </Text>
      </View>

      {next || canMarkPaid ? (
        <View style={styles.actions}>
          {next ? (
            <Button
              label={next}
              tone="tinted"
              tint={NEXT_TINT[order.status]}
              loading={busy}
              onPress={onNext}
              style={styles.flex}
            />
          ) : null}
          {canMarkPaid ? (
            <Button
              label={t('ownerOrders.markPaid.open')}
              tone="secondary"
              onPress={onMarkPaid}
              style={!next && styles.flex}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Canvas ticket: 20 px padding, 16 px between parts.
  card: { padding: tokens.owner.controls.cardPadding, gap: tokens.space[4] },
  top: { gap: tokens.space[4] },
  compact: { padding: tokens.space[4], gap: tokens.space[3] },
  compactTop: { gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  flex: { flex: 1, minWidth: 0 },
  where: { fontSize: 17, lineHeight: 22, fontFamily: fontFamily.strong },
  sub: { fontSize: 14, lineHeight: 20 },
  lines: { gap: 10 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[3] },
  dish: { fontSize: 16, lineHeight: 22 },
  qty: { fontFamily: fontFamily.strong, fontVariant: ['tabular-nums'] },
  sum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
    paddingTop: 14,
    borderTopWidth: 1,
  },
  num: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: tokens.space[2] },
});
