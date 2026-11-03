import { sampleMedia, type SampleMediaKey } from './media';

export function resolveMedia(url: string): number | { uri: string } {
  const marker = '/media/';
  const start = url.indexOf(marker);
  if (start < 0) return { uri: url };
  const key = url.slice(start + marker.length);
  if (key in sampleMedia) return sampleMedia[key as SampleMediaKey];
  return { uri: url };
}
