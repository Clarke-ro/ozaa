import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Armchair, Bell, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { FLOOR_TONES, type FloorTone } from '@/theme/palette';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import type { FloorStatus } from '../../floor/floorStatus';

// Four colour families: empty, occupied, paying, and calling for a waiter.
export const TONE_OF: Record<FloorStatus, FloorTone> = {
  free: 'free',
  seated: 'occupied',
  ordered: 'occupied',
  waiting_to_pay: 'paying',
  needs_waiter: 'calling',
};

const ICON: Record<FloorTone, LucideIcon> = {
  free: Armchair,
  occupied: Users,
  paying: Receipt,
  calling: Bell,
};

export const STATUS_LABEL: Record<FloorStatus, string> = {
  free: 'owner.free',
  seated: 'owner.seated',
  ordered: 'owner.ordered',
  waiting_to_pay: 'owner.waitingPay',
  needs_waiter: 'owner.needsWaiter',
};

/** One table on the floor: a flat tile with a coloured top strip, the code, an icon and a word. */
export function FloorTile({
  code,
  label,
  status,
  billPesewas,
  currency,
  selected,
  onPress,
}: {
  code: string;
  label?: string;
  status: FloorStatus;
  billPesewas?: number | null;
  currency: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(false);
  const tone = TONE_OF[status];
  const look = FLOOR_TONES[theme.scheme][tone];
  const Icon = ICON[tone];
  const word = t(STATUS_LABEL[status]);
  const bill = billPesewas ? formatMoney(pesewas(billPesewas), currency) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={[label ?? t('ownerFloor.tableName', { name: code }), word, bill]
        .filter(Boolean)
        .join(', ')}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.tile,
        {
          backgroundColor: pressed || hovered ? theme.wash : theme.surface,
          borderColor: selected ? theme.text : theme.line,
        },
        selected && styles.selected,
      ]}
    >
      {/* The status colour is a strip, not the whole tile: calm to scan, still quick to read. */}
      <View style={[styles.strip, { backgroundColor: look.edge }]} />
      <Text variant="display-m" numberOfLines={1} style={{ color: theme.text }}>
        {code}
      </Text>
      <View>
        <View style={styles.state}>
          <Icon size={16} color={look.ink} strokeWidth={2.4} />
          <Text variant="caption" numberOfLines={1} style={[styles.word, { color: look.ink }]}>
            {word}
          </Text>
        </View>
        <Text
          variant="caption"
          numberOfLines={1}
          style={[styles.bill, { color: theme.muted, opacity: bill ? 1 : 0 }]}
        >
          {bill ?? ' '}
        </Text>
      </View>
    </Pressable>
  );
}

// Room for the code plus two caption lines (status, bill), so every tile in a row is the same
// height whether or not it has a bill. Two touch targets plus a gap comes to 104 px.
const TILE_MIN_HEIGHT = tokens.touchTarget * 2 + tokens.space[4];
const SELECTED_BORDER = 2;

const styles = StyleSheet.create({
  tile: {
    minHeight: TILE_MIN_HEIGHT,
    padding: tokens.space[3],
    paddingTop: tokens.space[3] + tokens.owner.statusEdge,
    borderRadius: tokens.radius.md,
    borderCurve: 'continuous',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  selected: { borderWidth: SELECTED_BORDER },
  strip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: tokens.owner.statusEdge,
  },
  state: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[1] },
  word: { fontFamily: fontFamily.strong, flexShrink: 1 },
  bill: { fontVariant: ['tabular-nums'] },
});
