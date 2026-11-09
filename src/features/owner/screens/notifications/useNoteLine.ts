import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChefHat,
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
  feedback: MessageSquare,
  staff_joined: UserPlus,
  staff_invited: Mail,
};

/**
 * What one notification says and how it looks: its icon, the sentence, when, and the colour its
 * tone gives (red for alerts, green for good news, the venue colour otherwise). Notifications
 * and Today's Needs you both draw notes from this, so they always read the same.
 */
export function useNoteLine(
  note: Note,
  now: number,
): { Icon: LucideIcon; title: string; when: string; ink: string } {
  const theme = useTheme();
  const { t } = useTranslation();
  const vars =
    typeof note.vars.amount === 'number'
      ? {
          ...note.vars,
          amount: formatMoney(pesewas(note.vars.amount), String(note.vars.currency)),
        }
      : note.vars;
  const reason =
    typeof note.vars.reason === 'string' ? t(`waiter.reasons.${note.vars.reason}`) : '';
  return {
    Icon: ICON[note.kind],
    title: t(`ownerNotes.kind.${note.kind}`, { ...vars, reason }),
    when: note.at ? timeAgo(note.at, now, t) : t('ownerNotes.now'),
    ink: note.tone === 'alert' ? theme.error : note.tone === 'good' ? theme.success : theme.ink,
  };
}
