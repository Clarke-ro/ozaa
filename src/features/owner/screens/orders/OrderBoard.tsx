import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react-native';
import type { Order } from '@/lib/api/types';
import { STATUS_TONES, type StatusTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { PressableScale } from '@/ui/PressableScale';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { BOARD_COLUMNS, boardColumns, type BoardColumn } from '../../desk/orderBoard';

export const COLUMN_TONE: Record<BoardColumn, StatusTone> = {
  new: 'order',
  cooking: 'info',
  ready: 'success',
};

/**
 * The kitchen board: New, Cooking and Ready, side by side on wide screens and one under the other
 * on phones. Each stage shows its oldest few tickets (2 on a phone, 3 wide) so the whole kitchen
 * fits on one screen. Its heading, with the count and an arrow, opens every ticket in that stage.
 */
export function OrderBoard({
  orders,
  side,
  renderCard,
}: {
  orders: readonly Order[];
  /** True when there is room for the three columns side by side. */
  side: boolean;
  renderCard: (order: Order) => ReactNode;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const cols = boardColumns(orders);
  const limit = side ? 3 : 2;
  return (
    <View style={side ? styles.row : styles.stack}>
      {BOARD_COLUMNS.map((id) => {
        const tone = STATUS_TONES[theme.scheme][COLUMN_TONE[id]];
        const stage = t(`ownerOrders.tabs.${id}`);
        const list = cols[id];
        const label = t('ownerOrders.columnLabel', { stage, count: list.length });
        return (
          <View key={id} style={[styles.column, side && styles.flex]}>
            <PressableScale
              accessibilityRole="link"
              accessibilityLabel={label}
              accessibilityHint={t('ownerOrders.seeStage')}
              onPress={() => router.push(`/owner/orders/stage/${id}`)}
              scale={0.98}
              style={styles.head}
            >
              {/* The stage colour as a dot as well as on the count, so it never rests on colour alone. */}
              <View style={[styles.dot, { backgroundColor: tone.line }]} />
              <Text accessibilityRole="header" style={styles.title}>
                {stage}
              </Text>
              <View style={[styles.count, { backgroundColor: tone.bg }]}>
                <Text style={[styles.countText, { color: tone.ink }]}>{list.length}</Text>
              </View>
              <View style={styles.spacer} />
              <ChevronRight size={20} color={theme.meta} />
            </PressableScale>
            {list.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.line }]}>
                <Text style={[styles.emptyText, { color: theme.meta }]}>
                  {t(`ownerOrders.empty.${id}`)}
                </Text>
              </View>
            ) : (
              // A ticket that moves stage fades out of one column and into the next, and the
              // cards around it slide to close or open the gap instead of jumping (apple-motion §7).
              // Reanimated skips all three when Reduce Motion is on.
              list.slice(0, limit).map((order) => (
                <Animated.View
                  key={order.id}
                  entering={FadeIn.duration(tokens.motion.enter)}
                  exiting={FadeOut.duration(tokens.motion.exit)}
                  layout={LinearTransition.duration(tokens.motion.enter)}
                >
                  {renderCard(order)}
                </Animated.View>
              ))
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: tokens.space[6] },
  stack: { gap: tokens.space[6] },
  flex: { flex: 1, minWidth: 0 },
  column: { gap: tokens.space[3] },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[2],
    minHeight: tokens.touchTarget,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: {
    fontSize: tokens.owner.type.title.size,
    lineHeight: tokens.owner.type.title.line,
    fontFamily: fontFamily.strong,
  },
  count: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 13, lineHeight: 18, fontFamily: fontFamily.strong },
  spacer: { flex: 1 },
  empty: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.owner.controls.cardRadius,
    paddingVertical: tokens.space[4],
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, lineHeight: 20 },
});
