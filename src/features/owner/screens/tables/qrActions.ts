import { Platform, Share } from 'react-native';
import { qrSvg } from '@/lib/qrSvg';

/** Print and download need a browser. On phones they would need expo-print / expo-sharing (not installed). */
export const canPrint = Platform.OS === 'web' && typeof window !== 'undefined';

/** Opens the print dialog with the given card HTML. Returns false if the browser blocked the window. */
export function printHtml(html: string): boolean {
  if (!canPrint) return false;
  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.write(html);
  win.document.close();
  win.focus();
  // Give the new window a moment to lay out the SVGs before the dialog opens.
  setTimeout(() => win.print(), 250);
  return true;
}

/** Saves a print-ready SVG of the QR code (black on white, scales to any size). */
export function downloadQr(url: string, fileName: string): boolean {
  if (!canPrint) return false;
  const blob = new Blob([qrSvg(url, 1024)], { type: 'image/svg+xml' });
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = `${fileName}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
  return true;
}

export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed';

/** Shares the table link with the phone's share sheet; on desktop browsers without one, copies it. */
export async function shareLink(url: string, title: string): Promise<ShareResult> {
  try {
    if (Platform.OS === 'web') {
      const nav = typeof navigator === 'undefined' ? undefined : navigator;
      if (nav?.share) {
        await nav.share({ title, url });
        return 'shared';
      }
      if (nav?.clipboard) {
        await nav.clipboard.writeText(url);
        return 'copied';
      }
      return 'failed';
    }
    const result = await Share.share({ title, message: `${title}: ${url}`, url });
    return result.action === Share.dismissedAction ? 'dismissed' : 'shared';
  } catch {
    return 'dismissed';
  }
}
