import type { Order } from '@/lib/api/types';
import type { LiveOrder } from './world';

type Line = [
  name: string,
  menuItemId: string,
  qty: number,
  unit: number,
  extras?: string,
  note?: string,
];

// A busy lunch at Mama's Kitchen for the owner Orders screen: two new tickets, one cooking and
// one ready, of different ages. `manual: true` keeps them where they are until staff move them,
// unlike the guest's own sample order, which moves itself along.
const QUEUE: {
  table: string | null;
  status: Order['status'];
  minutesAgo: number;
  lines: Line[];
  /** The guest's instructions for the whole order (Order.note). */
  note?: string;
}[] = [
  {
    table: '3',
    status: 'received',
    minutesAgo: 2,
    lines: [
      ['Waakye special', 'itm_mamas1', 2, 4500, 'Extra egg', 'One without shito'],
      ['Sobolo', 'itm_mamas4', 2, 1500],
    ],
  },
  {
    table: null,
    status: 'accepted',
    minutesAgo: 6,
    lines: [['Jollof & chicken', 'itm_mamas0', 3, 6500]],
  },
  {
    table: '5',
    status: 'preparing',
    minutesAgo: 18,
    lines: [
      ['Banku & tilapia', 'itm_mamas2', 1, 9000, 'Large fish'],
      ['Kɛlɛwɛlɛ', 'itm_mamas3', 1, 2000],
    ],
    note: 'Bring everything out together, please',
  },
  {
    table: '9',
    status: 'ready',
    minutesAgo: 22,
    lines: [['Jollof & chicken', 'itm_mamas0', 2, 6500]],
  },
];

export function kitchenQueue(now: number, firstNumber: number): LiveOrder[] {
  return QUEUE.map((ticket, index) => {
    const at = new Date(now - ticket.minutesAgo * 60_000).toISOString();
    const lines = ticket.lines.map(([name, menuItemId, quantity, unit, extras, note], n) => ({
      id: `oln_q${index}_${n}`,
      menuItemId,
      name,
      quantity,
      modifiers: extras ? [{ name: extras, pricePesewas: 0 }] : [],
      unitPricePesewas: unit,
      totalPesewas: unit * quantity,
      ...(note ? { note } : {}),
      paid: false,
    }));
    const total = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
    return {
      manual: true,
      receivedAt: now - ticket.minutesAgo * 60_000,
      order: {
        id: `ord_q${index}`,
        number: firstNumber + index,
        venueId: 'ven_mamas',
        tableCode: ticket.table,
        status: ticket.status,
        paymentStatus: 'unpaid',
        lines,
        note: ticket.note ?? null,
        subtotalPesewas: total,
        taxes: [],
        totalPesewas: total,
        paidPesewas: 0,
        etaMinutes: ticket.status === 'ready' ? 0 : 15,
        createdAt: at,
        updatedAt: at,
        readyAt: ticket.status === 'ready' ? at : null,
      },
    } as LiveOrder;
  });
}

/**
 * A new Chowdeck order for the Orders screen (BUILD.md 5b.5): delivery, paid on Chowdeck (the
 * customer pays Chowdeck, which pays the venue), with 6 minutes left to accept before Chowdeck
 * rejects it. `manual: true` keeps it waiting until staff accept it.
 */
export function chowdeckOrder(now: number, number: number): LiveOrder {
  const at = new Date(now - 60_000).toISOString();
  const lines = [
    { id: 'oln_cd_0', menuItemId: 'itm_mamas0', name: 'Jollof & chicken', quantity: 2, unit: 6500 },
    { id: 'oln_cd_1', menuItemId: 'itm_mamas4', name: 'Sobolo', quantity: 2, unit: 1500 },
  ].map(({ unit, ...line }) => ({
    ...line,
    modifiers: [],
    unitPricePesewas: unit,
    totalPesewas: unit * line.quantity,
    paid: true,
  }));
  const total = lines.reduce((sum, line) => sum + line.totalPesewas, 0);
  return {
    manual: true,
    receivedAt: now - 60_000,
    order: {
      id: 'ord_chowdeck',
      number,
      venueId: 'ven_mamas',
      tableCode: null,
      status: 'received',
      paymentStatus: 'paid',
      paymentMethod: 'chowdeck',
      source: 'delivery',
      channel: 'chowdeck',
      externalRef: 'CHW-48213',
      acceptBy: new Date(now + 6 * 60_000).toISOString(),
      contact: { name: 'Kofi', phone: '+233241234567' },
      deliveryAddress: 'East Legon, near the A&C Mall',
      lines,
      note: null,
      subtotalPesewas: total,
      taxes: [],
      totalPesewas: total,
      paidPesewas: total,
      etaMinutes: 25,
      createdAt: at,
      updatedAt: at,
      readyAt: null,
    },
  };
}
