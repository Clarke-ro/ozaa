/**
 * Times the staff hot paths on a throwaway database inside this process (PGlite).
 * Run from server/: npx tsx scripts/bench-hot-paths.ts
 * It never reads DATABASE_URL and never talks to a real server.
 */
import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';
import { and, eq, gte, inArray, notInArray, or, sql } from 'drizzle-orm';
import type { Db } from '../src/db/client.ts';
import { orderLines, orders } from '../src/db/schema.ts';
import { testDb } from '../src/db/testDb.ts';
import { listOwnerOrders } from '../src/orders/listOrders.ts';
import { orderTotals } from '../src/routes/deskStats.ts';

const NOW = Date.parse('2026-11-16T12:00:00.000Z');
const VENUE = 'ven_1';
const ORDERS = 4_000;
const LINES = 4;
const RUNS = 5;

async function median(run: () => Promise<unknown>): Promise<number> {
  await run();
  const samples: number[] = [];
  for (let i = 0; i < RUNS; i += 1) {
    const start = performance.now();
    await run();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)] ?? 0;
}

function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

/** The old home screen: two days of orders, then every dish line, then a loop in JavaScript. */
async function totalsInJs(db: Db): Promise<number> {
  const since = new Date(NOW - 2 * 86_400_000);
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      paid: orders.paidPesewas,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(
      and(
        eq(orders.venueId, VENUE),
        or(gte(orders.createdAt, since), notInArray(orders.status, ['served', 'cancelled'])),
      ),
    );
  if (rows.length > 0) {
    await db
      .select({ orderId: orderLines.orderId, total: orderLines.totalPesewas })
      .from(orderLines)
      .where(
        inArray(
          orderLines.orderId,
          rows.map((row) => row.id),
        ),
      );
  }
  const todayStart = NOW - 12 * 3_600_000;
  let sales = 0;
  for (const row of rows) {
    if (row.status !== 'cancelled' && row.createdAt.getTime() >= todayStart) sales += row.paid;
  }
  return sales;
}

async function countOpen(db: Db): Promise<number> {
  const result = await db.execute(sql`
    select count(*)::int as n from orders
    where venue_id = ${VENUE}
      and status in ('received', 'accepted', 'preparing', 'ready')
  `);
  const list = Array.isArray(result)
    ? result
    : ((result as { rows?: { n?: number }[] }).rows ?? []);
  return Number(list[0]?.n ?? 0);
}

async function main() {
  const db = await testDb();
  await db.execute(sql`insert into businesses (id, name) values ('bus_1', 'Mama')`);
  await db.execute(sql`
    insert into venues (id, business_id, slug, name, profile)
    values ('ven_1', 'bus_1', 'mamas-kitchen', 'Mama', '{}'::jsonb)
  `);
  await db.execute(sql`
    insert into orders (
      id, venue_id, number, business_day, table_code, status,
      subtotal_pesewas, total_pesewas, paid_pesewas, created_at, updated_at
    )
    select
      'ord_' || g,
      'ven_1',
      g,
      (timestamp '2026-11-16 12:00:00+00' - (g * interval '2 minutes'))::date,
      ((g % 12) + 1)::text,
      case
        when g % 80 = 0 then 'received'
        when g % 40 = 0 then 'preparing'
        when g % 7 = 0 then 'cancelled'
        else 'served'
      end,
      2500,
      2500,
      case when g % 7 = 0 or g % 40 = 0 then 0 else 2500 end,
      timestamp '2026-11-16 12:00:00+00' - (g * interval '2 minutes'),
      timestamp '2026-11-16 12:00:00+00' - (g * interval '2 minutes') + interval '30 seconds'
    from generate_series(1, ${ORDERS}) as g
  `);
  await db.execute(sql`
    insert into orders (
      id, venue_id, number, business_day, table_code, status,
      subtotal_pesewas, total_pesewas, paid_pesewas, created_at, updated_at
    )
    select
      'old_' || g,
      'ven_1',
      100000 + g,
      date '2026-10-01',
      '9',
      'received',
      1800,
      1800,
      0,
      timestamp '2026-10-01 12:00:00+00' + (g * interval '1 minute'),
      timestamp '2026-10-01 12:00:00+00' + (g * interval '1 minute')
    from generate_series(1, 40) as g
  `);
  await db.execute(sql`
    insert into order_lines (
      id, order_id, position, menu_item_id, name, quantity, unit_price_pesewas, total_pesewas
    )
    select
      'ln_' || g || '_' || p,
      'ord_' || g,
      p,
      'item_jollof',
      'Jollof',
      1,
      2500,
      2500
    from generate_series(1, ${ORDERS}) as g
    cross join generate_series(1, ${LINES}) as p
  `);

  const full = await listOwnerOrders(db, VENUE, { statuses: [], live: false });
  const watermark = full[0]?.updatedAt;
  const changed = watermark
    ? await listOwnerOrders(db, VENUE, {
        statuses: [],
        live: false,
        updatedSince: new Date(watermark),
      })
    : [];
  const fullJson = JSON.stringify({ items: full, nextCursor: null });
  const changedJson = JSON.stringify({ items: changed, nextCursor: null });
  const fullGzip = gzipSync(fullJson).length;
  const changedGzip = gzipSync(changedJson).length;

  console.log(`seed: ${ORDERS} orders, ${ORDERS * LINES} lines, 40 old open orders`);
  console.log(
    `full page: ${full.length} orders, ${kb(Buffer.byteLength(fullJson))} json, ${kb(fullGzip)} gzip`,
  );
  console.log(
    `changed-since page: ${changed.length} orders, ${kb(Buffer.byteLength(changedJson))} json, ${kb(changedGzip)} gzip`,
  );
  console.log(
    `20 phones, every 5s, one minute: ${kb(20 * 12 * Buffer.byteLength(fullJson))} full, ${kb(20 * 12 * Buffer.byteLength(changedJson))} changed-since`,
  );

  const jsMs = await median(() => totalsInJs(db));
  const sqlMs = await median(() => orderTotals(db, VENUE, NOW, 'Africa/Accra'));
  const fullMs = await median(() => listOwnerOrders(db, VENUE, { statuses: [], live: false }));
  const deltaMs = await median(() =>
    listOwnerOrders(db, VENUE, {
      statuses: [],
      live: false,
      updatedSince: watermark ? new Date(watermark) : undefined,
    }),
  );
  const openWith = await median(() => countOpen(db));
  await db.execute(sql`drop index if exists orders_venue_open`);
  const openWithout = await median(() => countOpen(db));
  const openCount = await countOpen(db);

  const line = (label: string, value: number) => console.log(`${label}: ${value.toFixed(1)} ms`);
  line('home totals in JS (load orders + lines)', jsMs);
  line('home totals in SQL', sqlMs);
  line('newest 300 with lines', fullMs);
  line('changed-since with lines', deltaMs);
  line(`open-order count with index (${openCount} open)`, openWith);
  line('open-order count after dropping the partial index', openWithout);
  console.log(
    'times are medians of 5 runs on local PGlite, after one warm-up. Not a network database.',
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
