import { asGhanaPhone, parseGhanaPhone } from '@/lib/phone';
import type { VenueSettingsPatch } from '@/lib/api/types';

export type AlertsPatch = { ok: true; patch: VenueSettingsPatch } | { ok: false };

/**
 * What to save for WhatsApp order alerts. Off saves null; on needs a number that parses, sent in
 * full international form (+233…) as the contract asks.
 */
export function alertsPatch(on: boolean, typed: string): AlertsPatch {
  if (!on) return { ok: true, patch: { whatsappAlerts: null } };
  const phone = asGhanaPhone(parseGhanaPhone(typed));
  return phone ? { ok: true, patch: { whatsappAlerts: phone } } : { ok: false };
}
