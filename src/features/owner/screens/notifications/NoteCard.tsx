import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Banknote,
  Bell,
  ChefHat,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Hourglass,
  Mail,
  MessageSquare,
  Receipt,
  UserPlus,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from 'lucide-react-native';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { timeAgo } from '@/lib/time';
import { tokens } from '@/theme/tokens';
import { Text } from '@/ui/Text';
import { useTheme } from '@/ui/theme';
import type { Note, NoteKind } from '../../desk/notifications';

const ICON: Record<NoteKind, LucideIcon> = {
  sold_out: UtensilsCrossed,
  payout: Wallet,
  bills: Receipt,
  order_late: Hourglass,
  call: Bell,
  order: ClipboardList,
  order_ready: ChefHat,
  payment: Banknote,
  payment_failed: CircleAlert,
  feedback: MessageSquare,
  staff_joined: UserPlus,
  staff_invited: Mail,
};

/** One notification as its own card: icon by tone, the line, when, and a tap to the right screen. */
export function NoteCard({ note, now }: { note: Note; now: number }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const Icon = ICON[note.kind];
  const vars =
    typeof note.vars.amount === 'number'
      ? {
          ...note.vars,
          amount: formatMoney(pesewas(note.vars.amount), String(note.vars.currency)),
        }
      : note.vars;
  const reason =
    typeof note.vars.reason === 'string' ? t(`waiter.reasons.${note.vars.reason}`) : '';
  const title = t(`ownerNotes.kind.${note.kind}`, { ...vars, reason });
  const ink =
    note.tone === 'alert' ? theme.error : note.tone === 'good' ? theme.success : theme.text;
  const bg =
    note.tone === 'alert' ? theme.errorTint : note.tone === 'good' ? theme.successTint : theme.wash;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => router.push(note.href as Href)}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.wash : theme.surface, borderColor: theme.line },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Icon size={18} color={ink} />
      </View>
      <View style={styles.flex}>
        <Text variant="body-strong" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" style={{ color: theme.muted }}>
          {note.at ? timeAgo(note.at, now, t) : t('ownerNotes.now')}
        </Text>
      </View>
      <ChevronRight size={18} color={theme.meta} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space[3],
    minHeight: 64,
    paddingHorizontal: tokens.space[4],
    paddingVertical: tokens.space[3],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: tokens.radius.lg,
    borderCurve: 'continuous',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
