import type { Promo, PromoInput } from '@/lib/api/types';
import { parseMoneyInput } from '@/lib/money';

/** What the promo sheet edits, as the owner types it. Money and numbers stay text until saved. */
export type PromoDraft = {
  name: string;
  kind: PromoInput['kind'];
  percent: string;
  amount: string;
  freeItemId: string | null;
  code: string;
  channel: PromoInput['channel'];
  days: number[];
  startTime: string;
  endTime: string;
  minSpend: string;
  enabled: boolean;
};

export const EMPTY_DRAFT: PromoDraft = {
  name: '',
  kind: 'percent_off',
  percent: '',
  amount: '',
  freeItemId: null,
  code: '',
  channel: 'all',
  days: [],
  startTime: '',
  endTime: '',
  minSpend: '',
  enabled: true,
};

const cedis = (pesewas: number | null | undefined) =>
  pesewas == null ? '' : String(pesewas / 100);

export function draftFrom(promo: Promo): PromoDraft {
  return {
    name: promo.name,
    kind: promo.kind,
    percent: promo.percent ? String(promo.percent) : '',
    amount: cedis(promo.amountPesewas),
    freeItemId: promo.freeItemId ?? null,
    code: promo.code ?? '',
    channel: promo.channel,
    days: promo.days ?? [],
    startTime: promo.startTime ?? '',
    endTime: promo.endTime ?? '',
    minSpend: cedis(promo.minSpendPesewas),
    enabled: promo.enabled,
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Check the draft and turn it into what the API takes. Returns the first field to fix, by key,
 * so the sheet can show the message next to it.
 */
export function toInput(
  draft: PromoDraft,
): { ok: true; input: PromoInput } | { ok: false; field: keyof PromoDraft } {
  if (draft.name.trim().length < 2) return { ok: false, field: 'name' };
  const percent = Number(draft.percent);
  if (
    draft.kind === 'percent_off' &&
    !(Number.isInteger(percent) && percent >= 1 && percent <= 100)
  )
    return { ok: false, field: 'percent' };
  const amount = parseMoneyInput(draft.amount);
  if (draft.kind === 'amount_off' && !amount) return { ok: false, field: 'amount' };
  if (draft.kind === 'free_item' && !draft.freeItemId) return { ok: false, field: 'freeItemId' };
  const code = draft.code.trim().toUpperCase();
  if (code && !/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, field: 'code' };
  const hasHours = Boolean(draft.startTime || draft.endTime);
  if (hasHours && !(TIME.test(draft.startTime) && TIME.test(draft.endTime)))
    return { ok: false, field: 'startTime' };
  const minSpend = draft.minSpend.trim() ? parseMoneyInput(draft.minSpend) : null;
  if (draft.minSpend.trim() && !minSpend) return { ok: false, field: 'minSpend' };
  return {
    ok: true,
    input: {
      name: draft.name.trim(),
      kind: draft.kind,
      percent: draft.kind === 'percent_off' ? percent : null,
      amountPesewas: draft.kind === 'amount_off' ? amount : null,
      freeItemId: draft.kind === 'free_item' ? draft.freeItemId : null,
      code: code || null,
      channel: draft.channel,
      days: [...draft.days].sort(),
      startTime: hasHours ? draft.startTime : null,
      endTime: hasHours ? draft.endTime : null,
      minSpendPesewas: minSpend,
      enabled: draft.enabled,
    },
  };
}
