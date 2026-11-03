import { deriveFloor } from './floorStatus';

const tables = [
  { id: 'tbl_1', code: '1', label: 'Table 1' },
  { id: 'tbl_3', code: '3', label: 'Table 3' },
  { id: 'tbl_7', code: '7', label: 'Table 7' },
  { id: 'tbl_12', code: '12', label: 'Table 12' },
];

test('a table with no order and no guest is free', () => {
  const [table] = deriveFloor({
    payments: true,
    tables: [tables[0]!],
    orders: [],
    calls: [],
    seatedCodes: [],
  });
  expect(table?.status).toBe('free');
  expect(table?.orderId).toBeNull();
});

test('a seated guest with no order is seated', () => {
  const [table] = deriveFloor({
    payments: true,
    tables: [tables[2]!],
    orders: [],
    calls: [],
    seatedCodes: ['7'],
  });
  expect(table?.status).toBe('seated');
});

test('an open kitchen ticket is ordered, and a served unpaid bill is waiting to pay', () => {
  const floor = deriveFloor({
    payments: true,
    tables,
    seatedCodes: [],
    calls: [],
    orders: [
      {
        id: 'ord_12',
        number: 24,
        tableCode: '12',
        status: 'preparing',
        paymentStatus: 'unpaid',
        totalPesewas: 9500,
        createdAt: '2026-10-31T12:44:00Z',
        updatedAt: '2026-10-31T12:44:00Z',
      },
      {
        id: 'ord_3',
        number: 18,
        tableCode: '3',
        status: 'served',
        paymentStatus: 'unpaid',
        totalPesewas: 4500,
        createdAt: '2026-10-31T12:10:00Z',
        updatedAt: '2026-10-31T12:10:00Z',
      },
    ],
  });
  expect(floor.find((table) => table.code === '12')).toMatchObject({
    status: 'ordered',
    orderNumber: 24,
    billPesewas: 9500,
  });
  expect(floor.find((table) => table.code === '3')?.status).toBe('waiting_to_pay');
});

test('a paid served table goes free, and a call beats every other status', () => {
  const floor = deriveFloor({
    payments: true,
    tables,
    seatedCodes: [],
    orders: [
      {
        id: 'ord_paid',
        number: 9,
        tableCode: '1',
        status: 'served',
        paymentStatus: 'paid',
        totalPesewas: 2000,
        createdAt: '2026-10-31T11:00:00Z',
        updatedAt: '2026-10-31T11:00:00Z',
      },
      {
        id: 'ord_12',
        number: 24,
        tableCode: '12',
        status: 'ready',
        paymentStatus: 'unpaid',
        totalPesewas: 9500,
        createdAt: '2026-10-31T12:50:00Z',
        updatedAt: '2026-10-31T12:50:00Z',
      },
    ],
    calls: [
      {
        id: 'wcl_1',
        tableCode: '12',
        reason: 'water',
        status: 'open',
        createdAt: '2026-10-31T12:55:00Z',
      },
    ],
  });
  expect(floor.find((table) => table.code === '1')?.status).toBe('free');
  expect(floor.find((table) => table.code === '12')).toMatchObject({
    status: 'needs_waiter',
    waiterReason: 'water',
    orderStatus: 'ready',
  });
});

test('a resolved call and a cancelled order do not hold the table', () => {
  const [table] = deriveFloor({
    payments: true,
    tables: [tables[0]!],
    seatedCodes: [],
    orders: [
      {
        id: 'ord_x',
        number: 2,
        tableCode: '1',
        status: 'cancelled',
        paymentStatus: 'unpaid',
        totalPesewas: 1000,
        createdAt: '2026-10-31T12:00:00Z',
        updatedAt: '2026-10-31T12:00:00Z',
      },
    ],
    calls: [
      {
        id: 'wcl_2',
        tableCode: '1',
        reason: 'bill',
        status: 'resolved',
        createdAt: '2026-10-31T12:55:00Z',
      },
    ],
  });
  expect(table?.status).toBe('free');
});

describe('with payments switched off', () => {
  const served = {
    id: 'ord_3',
    number: 18,
    tableCode: '3',
    status: 'served' as const,
    paymentStatus: 'unpaid' as const,
    totalPesewas: 4500,
    createdAt: '2026-10-31T12:00:00Z',
    updatedAt: '2026-10-31T12:30:00Z',
  };
  const table3 = [tables[1]!];

  test('a served unpaid order is not waiting to pay; the guests are still at the table', () => {
    const [table] = deriveFloor({
      payments: false,
      tables: table3,
      orders: [served],
      calls: [],
      seatedCodes: [],
    });
    expect(table?.status).toBe('seated');
    expect(table?.billPesewas).toBe(4500);
  });

  test('asking for the bill puts the table in waiting for the bill, even once a waiter is on the way', () => {
    for (const status of ['open', 'acknowledged'] as const) {
      const [table] = deriveFloor({
        payments: false,
        tables: table3,
        orders: [served],
        calls: [
          {
            id: 'wcl_b',
            tableCode: '3',
            reason: 'bill',
            status,
            createdAt: '2026-10-31T12:40:00Z',
          },
        ],
        seatedCodes: [],
      });
      expect(table).toMatchObject({
        status: 'waiting_to_pay',
        waiterCallId: 'wcl_b',
        waiterReason: 'bill',
      });
    }
  });

  test('other requests still need a waiter', () => {
    const [table] = deriveFloor({
      payments: false,
      tables: table3,
      orders: [served],
      calls: [
        {
          id: 'wcl_w',
          tableCode: '3',
          reason: 'water',
          status: 'open',
          createdAt: '2026-10-31T12:40:00Z',
        },
      ],
      seatedCodes: [],
    });
    expect(table?.status).toBe('needs_waiter');
  });

  test('settling the bill request frees the table', () => {
    const [table] = deriveFloor({
      payments: false,
      tables: table3,
      orders: [served],
      calls: [
        {
          id: 'wcl_b',
          tableCode: '3',
          reason: 'bill',
          status: 'resolved',
          createdAt: '2026-10-31T12:40:00Z',
        },
      ],
      seatedCodes: [],
    });
    expect(table?.status).toBe('free');
  });

  test('a new order after a settled bill opens the table again', () => {
    const [table] = deriveFloor({
      payments: false,
      tables: table3,
      orders: [{ ...served, id: 'ord_4', status: 'received', createdAt: '2026-10-31T13:00:00Z' }],
      calls: [
        {
          id: 'wcl_b',
          tableCode: '3',
          reason: 'bill',
          status: 'resolved',
          createdAt: '2026-10-31T12:40:00Z',
        },
      ],
      seatedCodes: [],
    });
    expect(table?.status).toBe('ordered');
  });
});
