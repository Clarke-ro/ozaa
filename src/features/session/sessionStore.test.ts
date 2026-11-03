import { useMyCalls } from './myCalls';
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
