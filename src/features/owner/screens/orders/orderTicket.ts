import type { Order } from '@/lib/api/types';

/** The words a ticket needs, already translated, so this file stays free of i18n and is easy to test. */
export type TicketWords = {
  title: string;
  placed: string;
  /** The guest's note for the whole order (Order.note), such as "Less salt". */
  note?: string | null;
  lines: { qty: number; name: string; extras: string[]; note?: string; price: string }[];
  sums: { label: string; value: string; strong?: boolean }[];
  footer: string;
};

// Dish names and notes are typed by owners and guests, so escape them before they go into HTML.
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

/**
 * A printable kitchen ticket as a small HTML page, 80 mm wide like a receipt printer roll.
 * It carries no guest name or phone (Act 843): a ticket can be left lying on the pass.
 */
export function ticketHtml(words: TicketWords): string {
  const lines = words.lines
    .map(
      (l) =>
        `<tr><td class="q">${l.qty}×</td><td>${escape(l.name)}${l.extras
          .map((e) => `<div class="x">${escape(e)}</div>`)
          .join(
            '',
          )}${l.note ? `<div class="n">${escape(l.note)}</div>` : ''}</td><td class="p">${escape(l.price)}</td></tr>`,
    )
    .join('');
  const sums = words.sums
    .map(
      (s) =>
        `<tr${s.strong ? ' class="s"' : ''}><td colspan="2">${escape(s.label)}</td><td class="p">${escape(s.value)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escape(words.title)}</title>
<style>
@page { size: 80mm auto; margin: 4mm; }
body { font: 13px/1.35 system-ui, sans-serif; color: #000; margin: 0; width: 72mm; }
h1 { font-size: 18px; margin: 0 0 2px; } .m { color: #333; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; } td { padding: 3px 0; vertical-align: top; }
.q { width: 28px; font-weight: 700; } .p { text-align: right; white-space: nowrap; }
.x { font-size: 12px; color: #333; } .n { font-size: 12px; font-style: italic; }
.o { font-weight: 700; border: 1px solid #000; padding: 4px 6px; margin-bottom: 8px; }
.t td { border-top: 1px dashed #000; } .s td { font-weight: 700; }
footer { margin-top: 10px; text-align: center; font-size: 11px; }
</style></head><body>
<h1>${escape(words.title)}</h1><div class="m">${escape(words.placed)}</div>
${words.note ? `<div class="o">${escape(words.note)}</div>` : ''}
<table>${lines}<tr class="t"><td colspan="3"></td></tr>${sums}</table>
<footer>${escape(words.footer)}</footer>
</body></html>`;
}

/** Whether this order can still be printed for the kitchen: anything not cancelled. */
export function canPrint(order: Pick<Order, 'status'>): boolean {
  return order.status !== 'cancelled';
}
