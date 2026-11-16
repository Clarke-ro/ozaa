import type { Page } from '@playwright/test';

export type Finding = {
  rule: 'name' | 'target' | 'contrast' | 'state';
  what: string;
  detail: string;
};

/**
 * A small accessibility check that runs inside the page, with no extra package. It covers the
 * rules from BUILD.md that break most often:
 * - every control has a name a screen reader can say
 * - every control is at least 24 px (the WCAG 2.2 minimum; 44 px is our own target)
 * - text has 4.5:1 contrast with what is behind it (3:1 for large text)
 * - a switch, checkbox, radio or tab says whether it is on or chosen
 */
export function audit(page: Page, minTarget: number): Promise<Finding[]> {
  return page.evaluate((min) => {
    const found: {
      rule: 'name' | 'target' | 'contrast' | 'state';
      what: string;
      detail: string;
    }[] = [];
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0';
    };
    const describe = (el: Element) =>
      `${el.tagName.toLowerCase()}[role=${el.getAttribute('role') ?? ''}] "${(
        el.getAttribute('aria-label') ??
        el.textContent ??
        ''
      )
        .trim()
        .slice(0, 40)}"`;

    const controls = document.querySelectorAll(
      'button, a[href], input:not([type=hidden]), select, textarea, [role=button], [role=link], [role=switch], [role=checkbox], [role=radio], [role=tab], [role=slider], [role=menuitem]',
    );
    for (const el of controls) {
      if (!visible(el) || el.closest('[aria-hidden=true]')) continue;
      const labelled = el.getAttribute('aria-labelledby');
      const name =
        el.getAttribute('aria-label') ||
        (labelled && document.getElementById(labelled)?.textContent) ||
        el.getAttribute('title') ||
        (el as HTMLInputElement).labels?.[0]?.textContent ||
        el.textContent;
      if (!name?.trim()) found.push({ rule: 'name', what: describe(el), detail: 'no name' });

      // A switch, checkbox or radio must say whether it's on, and a tab whether it's chosen.
      // React Native Web ignores accessibilityState, so a missing aria-* prop shows up here.
      const role = el.getAttribute('role');
      const needs =
        role === 'switch' || role === 'checkbox' || role === 'radio'
          ? 'aria-checked'
          : role === 'tab'
            ? 'aria-selected'
            : null;
      if (needs && !el.hasAttribute(needs)) {
        found.push({ rule: 'state', what: describe(el), detail: `no ${needs}` });
      }

      // A link inside running text is exempt from the size rule.
      const r = el.getBoundingClientRect();
      if (el.tagName !== 'A' && Math.min(r.width, r.height) < min) {
        found.push({
          rule: 'target',
          what: describe(el),
          detail: `${Math.round(r.width)}×${Math.round(r.height)}`,
        });
      }
    }

    // Contrast maths from WCAG 2: relative luminance of each colour, then (L1 + 0.05) / (L2 + 0.05).
    const parse = (c: string) => {
      const m = c.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const [r, g, b, a = 1] = m[1]
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      return { r, g, b, a };
    };
    const lum = ({ r, g, b }: { r: number; g: number; b: number }) => {
      const ch = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const backgroundOf = (el: Element | null) => {
      for (let node = el; node; node = node.parentElement) {
        const s = getComputedStyle(node);
        // Text over a photo can't be measured here, so it's skipped.
        if (s.backgroundImage !== 'none') return null;
        const bg = parse(s.backgroundColor);
        if (bg && bg.a >= 0.95) return bg;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const el = node.parentElement;
      if (!el || seen.has(el) || !node.textContent?.trim() || !visible(el)) continue;
      seen.add(el);
      if (el.closest('[aria-hidden=true], [aria-disabled=true], [disabled]')) continue;
      const s = getComputedStyle(el);
      const fg = parse(s.color);
      const bg = backgroundOf(el);
      if (!fg || !bg || fg.a < 0.95 || Number(s.opacity) < 1) continue;
      const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
      const ratio = (hi + 0.05) / (lo + 0.05);
      const size = parseFloat(s.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(s.fontWeight) >= 700);
      if (ratio < (large ? 3 : 4.5)) {
        found.push({
          rule: 'contrast',
          what: `"${node.textContent.trim().slice(0, 40)}"`,
          detail: `${ratio.toFixed(2)} (${s.color} on rgb(${bg.r}, ${bg.g}, ${bg.b}))`,
        });
      }
    }
    return found;
  }, minTarget);
}
