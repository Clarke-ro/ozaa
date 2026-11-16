import { laterOption } from './laterOption';

test('at a table: request the bill after the meal', () => {
  expect(laterOption({ tableCode: '12', source: 'table' })).toBe('payment.billLater');
});

test('delivery: pay when it arrives', () => {
  expect(laterOption({ tableCode: null, source: 'delivery' })).toBe('payment.onDelivery');
});

test('pickup: no way round paying in the app', () => {
  expect(laterOption({ tableCode: null, source: 'pickup' })).toBeNull();
});
