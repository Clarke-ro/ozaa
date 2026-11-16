/**
 * The address a table's QR code holds: the venue's table page on the site the app runs on
 * (EXPO_PUBLIC_SITE_URL), e.g. https://cravins-app.vercel.app/mamas-kitchen/t/12. Scanning it
 * starts a table visit; the venue's own link (/slug) is online ordering instead.
 */
export function tableLink(siteUrl: string, slug: string, code: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${slug}/t/${encodeURIComponent(code)}`;
}
