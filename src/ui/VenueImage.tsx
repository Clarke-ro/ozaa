import { Image, type ImageStyle } from 'expo-image';
import { resolveMedia } from '@/mocks/resolveMedia';
import type { StyleProp } from 'react-native';

export function VenueImage({
  url,
  alt,
  style,
}: {
  url: string;
  alt: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={resolveMedia(url)}
      alt={alt}
      accessibilityLabel={alt}
      style={style}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={150}
    />
  );
}
