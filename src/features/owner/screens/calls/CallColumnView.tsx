import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import { CallCard } from './CallCard';
import type { CallColumn } from './callBoard';

/**
 * One column of the calls board: its name and count, then a card per call, or a quiet line when
 * it is empty. `limit` keeps Done to the latest few, so the board does not grow all day.
 */
export function CallColumnView({
  column,
  calls,
  now,
  busyId,
  limit,
  onAnswer,
  showTitle = true,
}: {
  column: CallColumn;
  calls: WaiterCall[];
  now: number;
  busyId: string | null;
  limit?: number;
  onAnswer: (call: WaiterCall, status: 'acknowledged' | 'resolved') => void;
  /** Phones show the column name in the tabs instead. */
  showTitle?: boolean;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const shown = limit ? calls.slice(0, limit) : calls;
  return (
    <View style={styles.column}>
      {showTitle ? (
        <View style={styles.title}>
          <Text variant="title" accessibilityRole="header">
            {t(`ownerCalls.status.${column}`)}
          </Text>
          <View style={[styles.count, { backgroundColor: theme.surface, borderColor: theme.line }]}>
            <Text variant="caption" style={{ color: theme.muted }}>
              {calls.length}
            </Text>
          </View>
        </View>
      ) : null}
      {shown.length === 0 ? (
        <View style={[styles.empty, { borderColor: theme.line }]}>
          <Text variant="caption" style={{ color: theme.meta }}>
            {t(`ownerCalls.emptyColumn.${column}`)}
          </Text>
        </View>
      ) : (
        shown.map((call) => (
          <CallCard
            key={call.id}
            call={call}
            now={now}
            busy={busyId === call.id}
            onAcknowledge={() => onAnswer(call, 'acknowledged')}
            onResolve={() => onAnswer(call, 'resolved')}
          />
        ))
      )}
      {limit && calls.length > limit ? (
        <Text variant="caption" style={[styles.more, { color: theme.meta }]}>
          {t('ownerCalls.latest', { count: limit })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flex: 1, minWidth: 0, gap: tokens.space[3] },
  title: { flexDirection: 'row', alignItems: 'center', gap: tokens.space[2] },
  count: {
    minWidth: tokens.space[6],
    paddingHorizontal: tokens.space[2],
    borderRadius: tokens.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  // A dashed outline where cards would go, so an empty column still reads as a column.
  empty: {
    alignItems: 'center',
    paddingVertical: tokens.space[6],
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: tokens.radius.md,
  },
  more: { textAlign: 'center' },
});
