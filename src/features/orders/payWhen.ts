export type PayWhen = 'now' | 'later';
export type Fulfilment = 'table' | 'pickup' | 'delivery';

const LATER: Record<Fulfilment, string> = {
  table: 'payWhen.laterTable',
  pickup: 'payWhen.laterPickup',
  delivery: 'payWhen.laterDelivery',
};

/**
 * When the guest pays, chosen before sending the order. "Now" opens the payment page (MoMo or
 * card) straight after; "later" means the bill after the meal at a table, or paying at pickup or
 * on delivery. Only venues with payments in the app offer "now". At a table, later is the usual.
 */
export function payWhenOptions(input: { payOnline: boolean; fulfilment: Fulfilment }): {
  choices: PayWhen[];
  initial: PayWhen;
  laterKey: string;
} {
  const laterKey = LATER[input.fulfilment];
  if (!input.payOnline) return { choices: ['later'], initial: 'later', laterKey };
  return {
    choices: ['now', 'later'],
    initial: input.fulfilment === 'table' ? 'later' : 'now',
    laterKey,
  };
}
