import {
  Bell,
  Calendar,
  Clock,
  CreditCard,
  Flag,
  Gamepad2,
  Gift,
  Info,
  Star,
  Tag,
  UtensilsCrossed,
  Wifi,
  type LucideIcon,
} from 'lucide-react-native';

const ICONS: Record<string, LucideIcon> = {
  menu: UtensilsCrossed,
  waiter: Bell,
  status: Clock,
  pay: CreditCard,
  wifi: Wifi,
  loyalty: Gift,
  offers: Tag,
  review: Star,
  play: Gamepad2,
  reserve: Calendar,
  events: Calendar,
  feedback: Flag,
  about: Info,
};

/** The Lucide glyph for a service id, at the brand's 2 px stroke. Unknown ids get Info. */
export function ServiceIcon({ id, color, size }: { id: string; color: string; size: number }) {
  const Glyph = ICONS[id] ?? Info;
  return <Glyph color={color} size={size} strokeWidth={2} />;
}
