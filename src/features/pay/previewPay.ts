import { pesewas, type Pesewas } from '@/lib/brand';
import { previewFee } from '@/lib/paystackFee';
import type { PayInput } from './payPick';
import { quoteBill } from './quoteBill';

export type PaySum = { share: number; tip: number; fee: number; due: number };

/**
 * What the guest will pay, worked out the server's way (quoteBill, previewFee) before the order
 * exists, so the order page can show it next to Place order. The server's quote is still the
 * figure charged. Cash is paid in person, so it carries no tip or payment fee. My items with no
 * dish ticked yet shows nothing to pay.
 */
export function previewPay(
  lines: readonly { id: string; totalPesewas: Pesewas }[],
  totalPesewas: number,
  input: PayInput,
  payMethods: Parameters<typeof previewFee>[1],
): PaySum {
  const whole = { share: totalPesewas, tip: 0, fee: 0, due: totalPesewas };
  if (input.pick === 'cash') return whole;
  try {
    const bill = quoteBill(
      {
        lines: lines.map((line) => ({ ...line, paid: false })),
        totalPesewas: pesewas(totalPesewas),
        paidPesewas: pesewas(0),
      },
      {
        mode: input.mode,
        parts: input.mode === 'equal' ? input.parts : undefined,
        lineIds: input.mode === 'items' ? input.mine : undefined,
        tip: { percent: input.tip },
      },
    );
    const fee = previewFee(bill.sharePesewas + bill.tipPesewas, payMethods);
    return { share: bill.sharePesewas, tip: bill.tipPesewas, fee, due: bill.totalPesewas + fee };
  } catch {
    return input.mode === 'items' ? { share: 0, tip: 0, fee: 0, due: 0 } : whole;
  }
}
