import { Image, type ImageStyle } from 'expo-image';
import { resolveMedia } from '@/mocks/resolveMedia';
import type { StyleProp } from 'react-native';
import { useTheme } from './theme';

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
