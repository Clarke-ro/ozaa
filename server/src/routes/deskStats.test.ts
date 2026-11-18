import { test } from 'node:test';
import assert from 'node:assert/strict';
import { businesses, orders, venues } from '../db/schema.ts';
import { testDb } from '../db/testDb.ts';
import { calendarDay } from '../shared/daySummary.ts';
import { orderTotals } from './deskStats.ts';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const DAY = 86_400_000;
const TZ = 'Africa/Accra';

test('order totals match the day rules, including an old open order and an old served bill', async () => {
  const db = await testDb();
  await db.insert(businesses).values({ id: 'bus_1', name: 'Mama' });
  await db
    .insert(venues)
    .values({
      id: 'ven_1',
      businessId: 'bus_1',
      slug: 'mamas-kitchen',
      name: 'Mama',
      timeZone: TZ,
      profile: {},
    });
  const rows = [
    {
      id: 'today_paid',
      number: 1,
      status: 'served' as const,
      total: 4_000,
      paid: 4_000,
      at: new Date('2026-11-16T08:00:00Z'),
    },
    {
      id: 'today_open',
      number: 2,
      status: 'received' as const,
      total: 2_000,
      paid: 0,
      at: new Date('2026-11-16T09:00:00Z'),
    },
    {
      id: 'today_cancel',
      number: 3,
      status: 'cancelled' as const,
      total: 9_000,
      paid: 0,
      at: new Date('2026-11-16T09:30:00Z'),
    },
    {
      id: 'yesterday',
      number: 4,
      status: 'served' as const,
      total: 5_000,
      paid: 5_000,
      at: new Date('2026-11-15T18:00:00Z'),
    },
    {
      id: 'bill_today',
      number: 5,
      status: 'served' as const,
      total: 1_500,
      paid: 500,
      at: new Date('2026-11-16T11:00:00Z'),
    },
    {
      id: 'old_open',
      number: 6,
      status: 'preparing' as const,
      total: 3_000,
      paid: 0,
      at: new Date('2026-10-01T12:00:00Z'),
    },
    {
      id: 'old_bill',
      number: 7,
      status: 'served' as const,
      total: 8_000,
      paid: 0,
      at: new Date('2026-10-01T12:00:00Z'),
    },
    {
      id: 'old_received',
      number: 8,
      status: 'received' as const,
      total: 700,
      paid: 0,
      at: new Date('2026-10-02T12:00:00Z'),
    },
  ];
  await db.insert(orders).values(
    rows.map((row) => ({
      id: row.id,
      venueId: 'ven_1',
      number: row.number,
      businessDay: row.at.toISOString().slice(0, 10),
      status: row.status,
      subtotalPesewas: row.total,
      totalPesewas: row.total,
      paidPesewas: row.paid,
      createdAt: row.at,
      updatedAt: row.at,
    })),
  );
  const totals = await orderTotals(db, 'ven_1', NOW, TZ);
  const since = NOW - 2 * DAY;
  const open = new Set(['received', 'accepted', 'preparing', 'ready']);
  const inSet = rows.filter((row) => row.at.getTime() >= since || open.has(row.status));
  const today = calendarDay(new Date(NOW).toISOString(), TZ);
  const yesterday = calendarDay(new Date(NOW - DAY).toISOString(), TZ);
  const day = (at: Date) => calendarDay(at.toISOString(), TZ);
  assert.equal(
    totals.salesTodayPesewas,
    inSet
      .filter((row) => row.status !== 'cancelled' && day(row.at) === today)
      .reduce((sum, row) => sum + row.paid, 0),
  );
  assert.equal(
    totals.ordersToday,
    inSet.filter((row) => row.status !== 'cancelled' && day(row.at) === today).length,
  );
  assert.equal(
    totals.yesterdayPesewas,
    inSet
      .filter((row) => row.status !== 'cancelled' && day(row.at) === yesterday)
      .reduce((sum, row) => sum + row.total, 0),
  );
  assert.equal(totals.pendingOrders, inSet.filter((row) => row.status === 'received').length);
  assert.equal(
    totals.bills,
    inSet.filter((row) => row.status === 'served' && (row.paid === 0 || row.paid < row.total))
      .length,
  );
  assert.equal(totals.liveOrders, inSet.filter((row) => open.has(row.status)).length);
  assert.equal(totals.salesTodayPesewas, 4_500);
  assert.equal(totals.ordersToday, 3);
  assert.equal(totals.yesterdayPesewas, 5_000);
  assert.equal(totals.pendingOrders, 2);
  assert.equal(totals.bills, 1);
  assert.equal(totals.liveOrders, 3);
});
