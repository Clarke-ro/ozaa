import { detailActions, type DetailTable, type NextStep } from './detailActions';

const base: DetailTable = { status: 'seated', orderId: null, waiterCallId: null };
const start: NextStep = { move: 'start', status: 'preparing' };

const primaries = (list: ReturnType<typeof detailActions>) =>
  list.filter((item) => item.tone === 'primary');

describe('detailActions', () => {
  it('has no actions for a table with no order and no call', () => {
    expect(detailActions(base, { hasBill: false, step: null })).toEqual([]);
  });

  it('makes On my way the one primary when a call is open', () => {
    const list = detailActions(
      { status: 'waiting_to_pay', orderId: 'o1', waiterCallId: 'c1' },
      { hasBill: true, step: null },
    );
    expect(list.map((item) => item.id)).toEqual(['acknowledge', 'resolve', 'markPaid']);
    expect(primaries(list).map((item) => item.id)).toEqual(['acknowledge']);
  });

  it('makes Mark paid the primary when payments are on and the table waits to pay', () => {
    const list = detailActions(
      { ...base, status: 'waiting_to_pay', orderId: 'o1' },
      { hasBill: true, step: null },
    );
    expect(list).toEqual([{ id: 'markPaid', tone: 'primary' }]);
  });

  it('never offers Mark paid before the bill has loaded', () => {
    const list = detailActions(
      { ...base, status: 'waiting_to_pay', orderId: 'o1' },
      { hasBill: false, step: null },
    );
    expect(list).toEqual([]);
  });

  it('offers the next kitchen step as a secondary action', () => {
    const list = detailActions(
      { ...base, status: 'ordered', orderId: 'o1' },
      { hasBill: true, step: start },
    );
    expect(list).toEqual([{ id: 'move', tone: 'secondary', move: 'start', next: 'preparing' }]);
  });

  it('has no kitchen step when the person has none to take', () => {
    const list = detailActions(
      { ...base, status: 'ordered', orderId: 'o1' },
      { hasBill: true, step: null },
    );
    expect(list).toEqual([]);
  });

  it('never has more than one primary', () => {
    const list = detailActions(
      { status: 'waiting_to_pay', orderId: 'o1', waiterCallId: 'c1' },
      { hasBill: true, step: { move: 'serve', status: 'served' } },
    );
    expect(list).toHaveLength(4);
    expect(primaries(list)).toHaveLength(1);
  });
});
