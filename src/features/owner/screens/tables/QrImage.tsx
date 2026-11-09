import Svg, { Path, Rect } from 'react-native-svg';
import { env } from '@/lib/env';
import { qrModules } from '@/lib/qrSvg';
import { QR_PAPER } from '@/theme/palette';

// A QR code must be dark on light or many phone cameras will not read it, so it never follows
// dark mode.
const QR_INK = '#111111';

/** A QR code for `url`, drawn as one SVG path, `size` points square. */
export function QrImage({ url, size }: { url: string; size: number }) {
  const drawn = qrModules(url || env.EXPO_PUBLIC_SITE_URL, size);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${drawn.size} ${drawn.size}`}>
      <Rect width={drawn.size} height={drawn.size} fill={QR_PAPER} />
      <Path d={drawn.path} fill={QR_INK} />
    </Svg>
  );
}
