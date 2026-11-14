import type { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Globe, Mail, Smartphone } from 'lucide-react-native';

// Small marks for the Social links rows (canvas): black for the social networks, their own green
// for Tripadvisor and WhatsApp. Drawn here so no image files or icon packages ship.
const S = 24;
const INK = '#111111';

function Instagram() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x="3" y="3" width="18" height="18" rx="5" stroke={INK} strokeWidth="2" fill="none" />
      <Circle cx="12" cy="12" r="4" stroke={INK} strokeWidth="2" fill="none" />
      <Circle cx="17.3" cy="6.7" r="1.2" fill={INK} />
    </Svg>
  );
}

function Facebook() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Circle cx="12" cy="12" r="10" fill={INK} />
      <Path
        fill="#FFFFFF"
        d="M13.2 22v-7.4h2.5l.4-2.9h-2.9V9.9c0-.8.2-1.4 1.4-1.4h1.6V5.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.8v2.1H7.8v2.9h2.5V22h2.9z"
      />
    </Svg>
  );
}

function TikTok() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path
        fill={INK}
        d="M16.6 3c.3 2.3 1.6 3.8 3.9 4v2.7c-1.4.1-2.6-.3-3.9-1.1v5.6c0 3.6-3.1 6-6.4 5.2-4.2-1.1-4.5-7.6.1-8.4.6-.1 1.2-.1 1.8 0v2.9c-.6-.2-1.1-.2-1.6-.1-1.6.4-1.5 2.9.3 3.1 1.2.1 2.1-.8 2.1-2.1V3h3.7z"
      />
    </Svg>
  );
}

function X() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M4 3h4.5l11.5 18h-4.5z" stroke={INK} strokeWidth="1.6" fill="none" />
      <Path d="M19.5 3 13.4 9.9M4.5 21l6.3-7.1" stroke={INK} strokeWidth="1.8" />
    </Svg>
  );
}

function YouTube() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x="2" y="5" width="20" height="14" rx="4" fill={INK} />
      <Path d="M10 9v6l5.2-3z" fill="#FFFFFF" />
    </Svg>
  );
}

function Tripadvisor() {
  const green = '#34E0A1';
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M3 9.5 L6 6.5 H18 L21 9.5" stroke={green} strokeWidth="2" fill="none" />
      <Circle cx="7.2" cy="14" r="4.6" stroke={green} strokeWidth="2.2" fill="none" />
      <Circle cx="16.8" cy="14" r="4.6" stroke={green} strokeWidth="2.2" fill="none" />
      <Circle cx="7.2" cy="14" r="1.6" fill={green} />
      <Circle cx="16.8" cy="14" r="1.6" fill={green} />
    </Svg>
  );
}

function WhatsApp() {
  return (
    <Svg width={S} height={S} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" fill="#25D366" />
      <Path
        fill="#FFFFFF"
        d="M8.6 7.2c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.1.3 0 .5.6 1.1 1.5 2 2.6 2.6.2.1.4.1.5 0l.7-.8c.2-.2.4-.2.6-.1l1.9.9c.2.1.3.3.3.5 0 .5-.2 1.2-.6 1.5-.6.5-1.4.6-2.3.4-1.3-.4-2.6-1.2-3.8-2.4-1.2-1.2-2-2.5-2.3-3.8-.2-.9 0-1.7.3-2.1z"
      />
    </Svg>
  );
}

/** The mark for each Social links row, keyed like the venue's `socials`. */
export const SOCIAL_LOGOS: Record<string, () => ReactNode> = {
  instagram: Instagram,
  facebook: Facebook,
  tiktok: TikTok,
  x: X,
  youtube: YouTube,
  tripadvisor: Tripadvisor,
  whatsapp: WhatsApp,
  phone: () => <Smartphone size={S} color={INK} />,
  email: () => <Mail size={S} color={INK} />,
  website: () => <Globe size={S} color={INK} />,
};
