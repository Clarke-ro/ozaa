import { useMyCalls } from './myCalls';
import { guestHomeHref } from './guestHome';
import { useGuestSession } from './sessionStore';

const visit = { token: 'gst_a', slug: 'mamas-kitchen', tableCode: '12' };

beforeEach(() => {
  useGuestSession.setState({ token: null, slug: null, tableCode: null, orderId: null });
  useMyCalls.setState({ ids: [] });
});

test('a new visit forgets the waiter calls from the last one', () => {
  useGuestSession.getState().saveGuest(visit);
  useMyCalls.getState().add(['call_1']);
  useGuestSession.getState().saveGuest({ token: 'gst_b', slug: 'bean-there', tableCode: '3' });
  expect(useMyCalls.getState().ids).toEqual([]);
});

test('scanning the same table again keeps them', () => {
  useGuestSession.getState().saveGuest(visit);
  useMyCalls.getState().add(['call_1']);
  useGuestSession.getState().saveGuest(visit);
  expect(useMyCalls.getState().ids).toEqual(['call_1']);
});

describe('the online-ordering link never continues a table visit', () => {
  test('opening /slug after a table scan ends the table visit for that venue', () => {
    useGuestSession.getState().saveGuest({ ...visit, orderId: 'ord_table' });
    useGuestSession.getState().startOnlineVisit('mamas-kitchen');
    expect(useGuestSession.getState()).toMatchObject({
      token: null,
      tableCode: null,
      orderId: null,
    });
  });
  test('a link customer coming back keeps their own online order', () => {
    useGuestSession
      .getState()
      .saveGuest({ token: 'gst_link', slug: 'bean-there', tableCode: null, orderId: 'ord_link' });
    useGuestSession.getState().startOnlineVisit('bean-there');
    expect(useGuestSession.getState()).toMatchObject({ token: 'gst_link', orderId: 'ord_link' });
  });
});

describe('guestHomeHref', () => {
  test('a table guest goes back to their table home; a link customer to the online menu', () => {
    expect(guestHomeHref('mamas-kitchen', '12')).toBe('/mamas-kitchen/t/12');
    expect(guestHomeHref('bean-there', null)).toBe('/bean-there');
  });
});
