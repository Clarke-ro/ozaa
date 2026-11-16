import { Platform } from 'react-native';
import { api } from '@/lib/api';
import { env } from '@/lib/env';
import { registerMockUpload } from '@/mocks/mediaRegistry';

export type MediaKind = 'banner' | 'logo' | 'dish_photo';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
// The contract's limit (api/openapi.yaml, ownerCreateMediaUpload): 5 MB keeps guest pages quick.
// Most phone photos fit; a bigger one is refused here before anything is sent.
const MAX_BYTES = 5 * 1024 * 1024;

export type UploadResult =
  | { ok: true; mediaId: string; previewUrl: string }
  | { ok: false; reason: 'cancelled' | 'unsupported' | 'type' | 'size' | 'failed' };

/** True where a file can be picked. Phones need expo-image-picker, which is not installed yet. */
export const canPickImages = Platform.OS === 'web' && typeof document !== 'undefined';

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = TYPES.join(',');
    input.onchange = () => resolve(input.files?.[0] ?? null);
    // Some browsers fire no event on cancel; `cancel` covers the ones that do.
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

function measure(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

/** Lets the owner choose a photo, then uploads it. Returns the media id to save on the dish or venue. */
export async function pickAndUploadImage(venueId: string, kind: MediaKind): Promise<UploadResult> {
  if (!canPickImages) return { ok: false, reason: 'unsupported' };
  const file = await pickFile();
  if (!file) return { ok: false, reason: 'cancelled' };
  if (!TYPES.includes(file.type)) return { ok: false, reason: 'type' };
  if (file.size > MAX_BYTES) return { ok: false, reason: 'size' };
  try {
    const slot = await api.ownerCreateMediaUpload(venueId, {
      kind,
      contentType: file.type,
      sizeBytes: file.size,
    });
    const previewUrl = URL.createObjectURL(file);
    if (env.EXPO_PUBLIC_API_MODE === 'mock') {
      registerMockUpload(slot.mediaId, { url: previewUrl, ...(await measure(previewUrl)) });
    } else {
      const put = await fetch(slot.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      if (!put.ok) return { ok: false, reason: 'failed' };
    }
    return { ok: true, mediaId: slot.mediaId, previewUrl };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
