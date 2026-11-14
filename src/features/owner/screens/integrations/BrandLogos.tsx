import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Small brand marks for the Integrations list (canvas), drawn here so no image files or icon
// packages ship. They only name the service the owner connects; Cravins isn't endorsed by them.
const SIZE = 24;

/** Paystack: four stacked bars, getting shorter. */
export function PaystackLogo() {
  const bar = '#0BA4DB';
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Rect x="2" y="3" width="20" height="3.6" rx="1" fill={bar} />
      <Rect x="2" y="8.2" width="20" height="3.6" rx="1" fill={bar} />
      <Rect x="2" y="13.4" width="17" height="3.6" rx="1" fill={bar} />
      <Rect x="2" y="18.6" width="11" height="3.6" rx="1" fill={bar} />
    </Svg>
  );
}

/** Google's four-colour G. */
export function GoogleLogo() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 48 48" accessibilityElementsHidden>
      <Path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <Path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <Path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <Path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </Svg>
  );
}

/** Tripadvisor: two round eyes. */
export function TripadvisorLogo() {
  const green = '#34E0A1';
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M3 9.5 L6 6.5 H18 L21 9.5" stroke={green} strokeWidth="2" fill="none" />
      <Circle cx="7.2" cy="14" r="4.6" stroke={green} strokeWidth="2.2" fill="none" />
      <Circle cx="16.8" cy="14" r="4.6" stroke={green} strokeWidth="2.2" fill="none" />
      <Circle cx="7.2" cy="14" r="1.6" fill={green} />
      <Circle cx="16.8" cy="14" r="1.6" fill={green} />
    </Svg>
  );
}

/** WhatsApp: a green speech bubble with a phone. */
export function WhatsAppLogo() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 24 24" accessibilityElementsHidden>
      <Path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" fill="#25D366" />
      <Path
        fill="#FFFFFF"
        d="M8.6 7.2c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.4 0 .6l-.5.7c-.1.2-.1.3 0 .5.6 1.1 1.5 2 2.6 2.6.2.1.4.1.5 0l.7-.8c.2-.2.4-.2.6-.1l1.9.9c.2.1.3.3.3.5 0 .5-.2 1.2-.6 1.5-.6.5-1.4.6-2.3.4-1.3-.4-2.6-1.2-3.8-2.4-1.2-1.2-2-2.5-2.3-3.8-.2-.9 0-1.7.3-2.1z"
      />
    </Svg>
  );
}
