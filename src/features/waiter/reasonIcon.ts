import {
  CircleHelp,
  GlassWater,
  HandPlatter,
  Receipt,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react-native';
import type { WaiterReason } from '@/lib/api/types';

/** One icon per waiter-call reason, shared by the guest Call waiter page and the owner's Calls. */
export const REASON_ICON: Record<WaiterReason, LucideIcon> = {
  water: GlassWater,
  bill: Receipt,
  cutlery: UtensilsCrossed,
  order_more: HandPlatter,
  clean_table: Sparkles,
  other: CircleHelp,
};

/** Every reason, in the order guests see them. */
export const REASONS = Object.keys(REASON_ICON) as WaiterReason[];
