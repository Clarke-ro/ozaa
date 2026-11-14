import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import type { WaiterCall } from '@/lib/api/types';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { fontFamily, useTheme } from '@/ui/theme';
import { cardStyle } from '../../kit';
import { callTimes } from './callBoard';

/** A finished call as one row (canvas): the table, what they asked for, and how fast it went. */
export function CallDoneRow({ call }: { call: WaiterCall }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { pickedUp, done } = callTimes(call);
  const parts = [
    pickedUp != null
      ? call.staffFirstName
        ? t('ownerCalls.pickedUpBy', { count: pickedUp, name: call.staffFirstName })
        : t('ownerCalls.pickedUp', { count: pickedUp })
      : null,
    done != null ? t('ownerCalls.doneIn', { count: done }) : null,
  ].filter(Boolean);
  const reason = t(`ownerCalls.reasonShort.${call.reason}`);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t('ownerCalls.openA11y', { table: call.tableCode, reason })}
      onPress={() => router.push(`/owner/calls/${call.id}`)}
      style={({ pressed }) => [
        cardStyle(theme),
        styles.row,
        pressed && { backgroundColor: theme.wash },
      ]}
    >
      <Text style={styles.table} numberOfLines={1}>
        {t('ownerOrders.table', { code: call.tableCode })}
      </Text>
      <Text style={styles.reason} numberOfLines={1}>
        {reason}
      </Text>
      <Text style={[styles.meta, { color: theme.meta }]}>{parts.join(' · ')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: tokens.space[4],
    rowGap: 4,
    minHeight: 64,
    paddingVertical: tokens.space[3],
    paddingHorizontal: tokens.owner.controls.cardPadding,
  },
  table: { width: 80, fontSize: 16, lineHeight: 22, fontFamily: fontFamily.strong },
  reason: { flex: 1, fontSize: 15, lineHeight: 20 },
  meta: { fontSize: 14, lineHeight: 20 },
});
