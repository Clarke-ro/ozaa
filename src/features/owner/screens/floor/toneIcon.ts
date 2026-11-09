import { Armchair, Bell, Receipt, Users, type LucideIcon } from 'lucide-react-native';
import type { FloorTone } from '@/theme/palette';

/** One icon per table colour, beside the status word. Kept apart from floorLook so tests stay icon-free. */
export const TONE_ICON: Record<FloorTone, LucideIcon> = {
  free: Armchair,
  occupied: Users,
  paying: Receipt,
  calling: Bell,
};
