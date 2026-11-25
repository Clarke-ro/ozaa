import type { TFunction } from 'i18next';
import type { Order } from '@/lib/api/types';
import { orderPlace } from './orderPlace';

// Keys and values come back as text, so the test reads which words were picked.
const t = ((key: string, values?: Record<string, string>) =>
  values?.name
    ? `${key}:${values.name}`
    : values?.code
      ? `${key}:${values.code}`
      : key) as unknown as TFunction;
const order = (over: Partial<Order>) => ({ tableCode: null, contact: null, ...over }) as Order;

test('a Chowdeck order says Chowdeck, and who for', () => {
  const chowdeck = order({
    channel: 'chowdeck',
    source: 'delivery',
    contact: { name: 'Kofi', phone: '+233241234567' },
  });
  expect(orderPlace(chowdeck, t)).toEqual({
    where: 'ownerOrders.source.chowdeckFor:Kofi',
    tile: 'ownerOrders.source.chowdeckCode',
  });
});

test('table and menu-link orders keep their words', () => {
  expect(orderPlace(order({ tableCode: '3', source: 'table' }), t).where).toBe(
    'ownerOrders.table:3',
  );
  const pickup = order({ source: 'pickup', contact: { name: 'Ama', phone: '+233241234567' } });
  expect(orderPlace(pickup, t).where).toBe('ownerOrders.source.pickupFor:Ama');
});
