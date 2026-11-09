import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronRight, MessageSquareText } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { tokens } from '@/theme/tokens';
import { Button } from '@/ui/Button';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { cardStyle, CodeTile, StatusPill } from '../../kit';
import { ticketAge } from '../../desk/ops';
import {
  AGE_TONE,
  orderPlace,
  PAID_TONE,
  paidLabel,
  STATUS_TONE,
  waitedLabel,
} from './orderPlace';

// Enough dishes to cook from at a glance; the rest are one tap away on the order's page.
const PREVIEW_LINES = 4;

/**
 * One ticket as its own card: where it goes and how long it has waited, the dishes to cook (with
 * add-ons and notes), what it costs and whether it is paid, and the one next step. The top of the
 * card opens the full order.
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
}) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const live = order.status !== 'served' && order.status !== 'cancelled';
  const age = ticketAge(order.createdAt, now);
  const { where, tile } = orderPlace(order, t);
  const time = new Date(order.createdAt).toLocaleTimeString(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const shown = order.lines.slice(0, PREVIEW_LINES);
  const hidden = order.lines.length - shown.length;
  const canMarkPaid = onMarkPaid && order.paymentStatus !== 'paid' && order.status !== 'cancelled';

  return (
    <View style={[cardStyle(theme), styles.card]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${where}, #${order.number}`}
        accessibilityHint={t('ownerOrders.openHint')}
        onPress={onOpen}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
          styles.top,
          (pressed || hovered) && { backgroundColor: theme.wash },
        ]}
      >
        <View style={styles.head}>
          <CodeTile
            code={tile}
            size={tokens.touchTarget}
            tone={order.status === 'received' ? 'tint' : 'wash'}
          />
          <View style={styles.flex}>
            <Text variant="body-strong" numberOfLines={1}>
              {where}
            </Text>
            <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
              #{order.number} · {time}
            </Text>
          </View>
          {live ? (
            <View accessibilityLabel={t('ownerOrders.waitedLabel', { count: age.minutes })}>
              <StatusPill label={waitedLabel(age.minutes, t)} tone={AGE_TONE[age.tone]} boxed />
            </View>
          ) : (
            <StatusPill
              label={t(`statusLabel.${order.status}`)}
              tone={STATUS_TONE[order.status]}
              boxed
            />
          )}
          <ChevronRight size={18} color={theme.meta} />
        </View>

        <View style={[styles.lines, { borderTopColor: theme.line }]}>
          {shown.map((line) => (
            <View key={line.id} style={styles.line}>
              <Text variant="body-strong" style={styles.qty}>
                {line.quantity}×
              </Text>
              <View style={styles.flex}>
                <Text variant="body" numberOfLines={1}>
                  {line.name}
                </Text>
                {line.modifiers?.length ? (
                  <Text variant="caption" numberOfLines={1} style={{ color: theme.muted }}>
                    + {line.modifiers.map((m) => m.name).join(', ')}
                  </Text>
                ) : null}
                {line.note ? (
                  <View style={[styles.note, { backgroundColor: theme.warningTint }]}>
                    <MessageSquareText size={14} color={theme.text} />
                    <Text variant="caption" numberOfLines={2} style={styles.shrink}>
                      {line.note}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))}
          {hidden > 0 ? (
            <Text variant="caption" style={[styles.more, { color: theme.muted }]}>
              {t('ownerOrders.moreDishes', { count: hidden })}
            </Text>
          ) : null}
        </View>
      </Pressable>

      <View style={[styles.foot, { borderTopColor: theme.line }]}>
        <View style={styles.sum}>
          <Text variant="body-strong" style={styles.num}>
            {formatMoney(pesewas(order.totalPesewas), currency)}
          </Text>
          <StatusPill
            label={paidLabel(order, t)}
            tone={PAID_TONE[order.paymentStatus]}
            icon={false}
          />
        </View>
        {next || canMarkPaid ? (
          <View style={styles.actions}>
            {next ? (
              // Outlined, not filled: "Create order" in the header is this screen's one filled button.
              <Button label={next} size="md" tone="secondary" loading={busy} onPress={onNext} />
            ) : null}
            {canMarkPaid ? (
              <Button
                label={t('ownerOrders.markPaid.open')}
                size="md"
                tone="ghost"
                onPress={onMarkPaid}
              />
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, overflow: 'hidden' },
  top: { flex: 1, padding: tokens.space[4], gap: tokens.space[3] },
  head: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[3] },
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  lines: {
    gap: tokens.space[2],
    paddingTop: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[2] },
  // A fixed column, so the dish names line up under each other.
  qty: { minWidth: tokens.space[6], fontVariant: ['tabular-nums'] },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: tokens.space[1],
    marginTop: tokens.space[1],
    paddingHorizontal: tokens.space[2],
    paddingVertical: tokens.space[1],
    borderRadius: tokens.radius.sm,
  },
  more: { paddingLeft: tokens.space[6] + tokens.space[2] },
  foot: {
    gap: tokens.space[3],
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sum: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.space[2],
  },
  num: { fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: tokens.space[2] },
});
