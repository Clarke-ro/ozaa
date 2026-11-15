/** The guest home's sections, in their usual order. */
export const HOME_SECTIONS = ['table', 'rewards', 'fun', 'more'] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];

/**
 * The sections in the owner's order (Branding > Guest home order). Sections the saved order
 * leaves out, or doesn't know, keep their usual place after the ones it names.
 */
export function orderSections(saved: readonly string[] | null | undefined): HomeSection[] {
  const known = (saved ?? []).filter((s): s is HomeSection =>
    (HOME_SECTIONS as readonly string[]).includes(s),
  );
  const first = [...new Set(known)];
  return [...first, ...HOME_SECTIONS.filter((s) => !first.includes(s))];
}
