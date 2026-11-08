/** The venue's public menu link, for Instagram, TikTok and WhatsApp bios: https://cravins.app/<slug>. */
export function menuLink(siteUrl: string, slug: string): string {
  return `${siteUrl.replace(/\/+$/, '')}/${slug}`;
}

// Owners paste this into their own website, so a name like `Ama "Mama" Osei` must not end the attribute.
function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * HTML for the venue's own website: the menu in a frame. 720 px tall fits a phone-shaped menu
 * on a desktop page; `loading="lazy"` keeps it from slowing the rest of their page.
 */
export function embedSnippet(url: string, venueName: string): string {
  return `<iframe src="${escapeAttr(url)}" title="${escapeAttr(`${venueName} menu`)}" width="100%" height="720" style="border:0;max-width:480px" loading="lazy"></iframe>`;
}
