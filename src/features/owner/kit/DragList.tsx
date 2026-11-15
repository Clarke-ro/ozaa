import { useMemo, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type PanResponderInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GripVertical, Move } from 'lucide-react-native';
import { hapticSelection } from '@/lib/haptics';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { dropIndex, moveItem, shiftFor } from './dragMath';

// Fixed row height, so a drag distance maps straight to a position.
const ROW = 56;
const GAP = tokens.space[2];

/**
 * A list you reorder by holding the grip and dragging. Built on React Native's own PanResponder
 * and Animated, so it works the same on phones and the web with nothing extra installed.
 * Screen readers get "Move up" / "Move down" actions instead of dragging.
 */
export function DragList<T extends { key: string; label: string }>({
  items,
  onOrder,
  renderRow,
  rowHeight = ROW,
  handle = 'grip',
  gripSide = 'end',
}: {
  items: readonly T[];
  onOrder: (keys: string[]) => void;
  /** What sits before the handle. Defaults to the row number and the label. */
  renderRow?: (item: T, index: number) => ReactNode;
  /** Every row is this tall, so a drag distance maps straight to a position. */
  rowHeight?: number;
  /** The grip lines, or a four-way move arrow. */
  handle?: 'grip' | 'move';
  /** Where the grip sits. Custom links (canvas) put it first. */
  gripSide?: 'start' | 'end';
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const STEP = rowHeight + GAP;
  const Handle = handle === 'move' ? Move : GripVertical;
  const [dy] = useState(() => new Animated.Value(0));
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const order = items.map((i) => i.key).join('|');

  // One handler per row, rebuilt only when the list itself changes. Dragging only changes
  // local state, so the handler under the finger stays the same for the whole drag.
  const handlers: PanResponderInstance[] = useMemo(() => {
    const keys = order.split('|');
    return keys.map((_key, from) =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          void hapticSelection();
          dy.setValue(0);
          setDrag({ from, to: from });
        },
        onPanResponderMove: (_e, g) => {
          dy.setValue(g.dy);
          const to = dropIndex(from, g.dy, STEP, keys.length);
          setDrag((d) => (d && d.to !== to ? { from, to } : d));
        },
        onPanResponderRelease: (_e, g) => {
          const to = dropIndex(from, g.dy, STEP, keys.length);
          dy.setValue(0);
          setDrag(null);
          if (to !== from) {
            void hapticSelection();
            onOrder(moveItem(keys, from, to));
          }
        },
        onPanResponderTerminate: () => {
          dy.setValue(0);
          setDrag(null);
        },
      }),
    );
  }, [order, onOrder, dy, STEP]);
  const keys = order.split('|');
  const moveWithAccessibility = (index: number, actionName: string) => {
    const direction = actionName === 'up' ? -1 : actionName === 'down' ? 1 : 0;
    const to = index + direction;
    if (direction !== 0 && to >= 0 && to < items.length) onOrder(moveItem(keys, index, to));
  };
  const grip = (index: number, lifted: boolean, label: string) => (
    <View
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${index + 1}. ${label}`}
      accessibilityActions={[
        { name: 'up', label: t('ownerMenu.moveUp', { name: label }) },
        { name: 'down', label: t('ownerMenu.moveDown', { name: label }) },
      ]}
      onAccessibilityAction={(event) => moveWithAccessibility(index, event.nativeEvent.actionName)}
      {...handlers[index]?.panHandlers}
      style={[styles.grip, gripSide === 'start' && styles.gripStart, { height: rowHeight }]}
    >
      <Handle size={gripSide === 'start' ? 16 : 20} color={lifted ? theme.ink : theme.meta} />
    </View>
  );

  return (
    <View style={[styles.list, { height: items.length * STEP - GAP }]}>
      {items.map((item, index) => {
        const lifted = drag?.from === index;
        const offset = drag && !lifted ? shiftFor(index, drag.from, drag.to, STEP) : 0;
        return (
          <Animated.View
            key={item.key}
            style={[
              styles.row,
              gripSide === 'start' && styles.rowStart,
              {
                top: index * STEP,
                height: rowHeight,
                backgroundColor: theme.surface,
                borderColor: theme.line,
                // Only the row being dragged casts a shadow: it is lifted off the list.
                boxShadow: lifted ? tokens.shadow.card : undefined,
                zIndex: lifted ? 2 : 1,
                transform: [{ translateY: lifted ? dy : offset }],
              },
            ]}
          >
            {gripSide === 'start' ? grip(index, lifted, item.label) : null}
            {renderRow ? (
              renderRow(item, index)
            ) : (
              <>
                <Text variant="caption" style={[styles.num, { color: theme.muted }]}>
                  {index + 1}
                </Text>
                <Text variant="body-strong" numberOfLines={1} style={styles.flex}>
                  {item.label}
                </Text>
              </>
            )}
            {gripSide === 'end' ? grip(index, lifted, item.label) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { position: 'relative' },
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    paddingStart: tokens.space[4],
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
  },
  rowStart: { paddingStart: 0, borderRadius: tokens.owner.controls.cardRadius },
  gripStart: { width: 40 },
  num: { width: 16, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  grip: {
    width: tokens.touchTarget + tokens.space[2],
    height: ROW,
    alignItems: 'center',
    justifyContent: 'center',
    // Stops the page scrolling while you drag on web.
    touchAction: 'none',
  } as object,
});
