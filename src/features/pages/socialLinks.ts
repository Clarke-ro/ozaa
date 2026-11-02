type Socials = Partial<Record<string, string | null | string[] | number | undefined>>;

// Order guests see them in. Handles become links on each network's own domain.
const PROFILE: [key: string, base: string][] = [
  ['instagram', 'https://instagram.com/'],
  ['facebook', 'https://facebook.com/'],
  ['tiktok', 'https://www.tiktok.com/@'],
  ['x', 'https://x.com/'],
  ['youtube', 'https://youtube.com/@'],
  ['tripadvisor', 'https://www.tripadvisor.com/'],
];

function web(value: string): string | null {
  const text = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(text);
    return url.protocol === 'https:' || url.protocol === 'http:'
      ? url.toString().replace(/\/$/, '')
      : null;
  } catch {
    return null;
  }
}

/** The venue's links as safe URLs, in a fixed order. Blank fields are left out. */
export function socialLinks(socials: Socials): { key: string; url: string }[] {
  const out: { key: string; url: string }[] = [];
  for (const [key, base] of PROFILE) {
    const raw = socials[key];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const value = raw.trim();
    const url = /[./]/.test(value) ? web(value) : web(base + value.replace(/^@/, ''));
    if (url) out.push({ key, url });
  }
  const site = socials.website;
  if (typeof site === 'string' && site.trim()) {
    const url = web(site.trim());
    if (url) out.push({ key: 'website', url });
  }
  const phone = socials.phone;
  if (typeof phone === 'string' && phone.replace(/[^\d+]/g, ''))
    out.push({ key: 'phone', url: `tel:${phone.replace(/[^\d+]/g, '')}` });
  const email = socials.email;
  if (typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    out.push({ key: 'email', url: `mailto:${email.trim()}` });
  return out;
}
