import type { components } from '@/lib/api/schema';

type Image = components['schemas']['Image'];

/**
 * Mock mode only. A real upload PUTs the file to the server's upload URL; the mock has no server,
 * so the picked file's local URL is kept here and the mock turns the media id back into an image.
 */
const uploads = new Map<string, Image>();

export function registerMockUpload(mediaId: string, image: Image): void {
  uploads.set(mediaId, image);
}

export function mockUploadedImage(mediaId: string | null | undefined): Image | undefined {
  return mediaId ? uploads.get(mediaId) : undefined;
}
