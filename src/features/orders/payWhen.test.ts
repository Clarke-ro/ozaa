import { payWhenOptions } from './payWhen';

test('at a table: pay now in the app, or ask for the bill after the meal (the usual)', () => {
  expect(payWhenOptions({ payOnline: true, fulfilment: 'table' })).toEqual({
    choices: ['now', 'later'],
    initial: 'later',
    laterKey: 'payWhen.laterTable',
  });
});

test('pickup and delivery: paying now comes first; later is at collection or the door', () => {
  expect(payWhenOptions({ payOnline: true, fulfilment: 'pickup' })).toMatchObject({
    initial: 'now',
    laterKey: 'payWhen.laterPickup',
  });
  expect(payWhenOptions({ payOnline: true, fulfilment: 'delivery' })).toMatchObject({
    laterKey: 'payWhen.laterDelivery',
  });
});

test('a venue without payments in the app: no choice, everyone pays in person', () => {
  expect(payWhenOptions({ payOnline: false, fulfilment: 'table' })).toEqual({
    choices: ['later'],
    initial: 'later',
    laterKey: 'payWhen.laterTable',
  });
});
