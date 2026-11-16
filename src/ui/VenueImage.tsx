import { Image, type ImageStyle } from 'expo-image';
import type { StyleProp } from 'react-native';
import { useTheme } from './theme';

// Demo photos ship only in a mock build: Expo writes EXPO_PUBLIC_API_MODE into the bundle, so a
// real-server build drops this branch and every sample image with it. Real URLs pass straight on.
const resolveMedia: (url: string) => number | { uri: string } =
  process.env.EXPO_PUBLIC_API_MODE === 'http'
    ? (url) => ({ uri: url })
    : // eslint-disable-next-line @typescript-eslint/no-require-imports -- see the note above
      (require('@/mocks/resolveMedia') as typeof import('@/mocks/resolveMedia')).resolveMedia;

/**
 * A venue photo. On a slow connection the slot shows a grey fill (or the photo's blurhash, when
 * the API sends one) until the file arrives, so the layout never jumps. BUILD.md section 11, Images.
 */
export function VenueImage({
  url,
  alt,
  blurhash,
  style,
}: {
  url: string;
  alt: string;
  blurhash?: string;
  style?: StyleProp<ImageStyle>;
}) {
  const theme = useTheme();
  return (
    <Image
      source={resolveMedia(url)}
      alt={alt}
      accessibilityLabel={alt}
      style={[{ backgroundColor: theme.wash }, style]}
      placeholder={blurhash ? { blurhash } : undefined}
      pointerEvents="none"
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
    />
  );
}
