import { Award, Crown, Medal, type LucideIcon } from 'lucide-react-native';
import type { TierId } from './facts';

/** Each tier has its own icon, so the card shows the member's level without words. */
export const TIER_ICON: Record<TierId, LucideIcon> = {
  bronze: Medal,
  silver: Award,
  gold: Crown,
};
