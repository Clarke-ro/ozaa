import {
  Calendar,
  Gift,
  Globe,
  Link,
  Music,
  Sparkles,
  Ticket,
  type LucideIcon,
} from 'lucide-react-native';

/** Icons an owner can put on a link. Keys are what the API stores in `icon`. */
export const LINK_ICONS: Record<string, LucideIcon> = {
  link: Link,
  globe: Globe,
  calendar: Calendar,
  ticket: Ticket,
  music: Music,
  gift: Gift,
  sparkles: Sparkles,
};
