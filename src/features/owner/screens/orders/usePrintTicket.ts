import { Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Order } from '@/lib/api/types';
import { pesewas } from '@/lib/brand';
import { formatMoney } from '@/lib/money';
import { orderPlace } from './orderPlace';
import { amountDue } from './orderSteps';
import { ticketHtml } from './orderTicket';

/**
 * Print an order's ticket from the web app: a small window with the ticket, then the browser's
 * print dialog. Phones need a print package first, so `available` is false there.
 */
export function usePrintTicket(currency: string) {
  const { t, i18n } = useTranslation();
  const available = Platform.OS === 'web' && typeof window !== 'undefined';
  const money = (v: number) => formatMoney(pesewas(v), currency);
  const print = (order: Order) => {
    if (!available) return;
    const due = amountDue(order);
    const html = ticketHtml({
      title: t('ownerOrders.detail.heading', {
        where: orderPlace(order, t).where,
        number: order.number,
      }),
      placed: t('ownerOrders.print.placed', {
        time: new Date(order.createdAt).toLocaleString(i18n.language, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        }),
      }),
      lines: order.lines.map((l) => ({
        qty: l.quantity,
        name: l.name,
        extras: (l.modifiers ?? []).map((m) => m.name),
        note: l.note,
        price: money(l.totalPesewas),
      })),
      note: order.note ? t('ownerOrders.orderNote', { note: order.note }) : undefined,
      sums: [
        { label: t('ownerOrders.detail.subtotal'), value: money(order.subtotalPesewas) },
        ...order.taxes.map((tax) => ({ label: tax.label, value: money(tax.amountPesewas) })),
        ...(order.deliveryFeePesewas
          ? [{ label: t('ownerOrders.detail.delivery'), value: money(order.deliveryFeePesewas) }]
          : []),
        { label: t('ownerOrders.detail.total'), value: money(order.totalPesewas), strong: true },
        ...(due > 0 && order.status !== 'cancelled'
          ? [{ label: t('ownerOrders.detail.due'), value: money(due), strong: true }]
          : []),
      ],
      footer: t('ownerOrders.print.footer'),
    });
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) return false;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
    return true;
  };
  return { available, print };
}
