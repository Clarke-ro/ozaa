import type { ApiClient } from './client';
import { ApiError } from './errors';
import { withGuestRetry } from './guestRetry';

const unauthorized = () => new ApiError(401, 'unauthorized', 'Sign in again');

function setup(renew: () => Promise<boolean>) {
  let token = 'gst_old';
  const createOrder = jest.fn(async () => {
    if (token !== 'gst_new') throw unauthorized();
    return { id: 'ord_1' };
  });
  const getOrder = jest.fn(async () => {
    throw unauthorized();
  });
  const base = { createOrder, getOrder } as unknown as ApiClient;
  const api = withGuestRetry(base, () => async () => {
    const ok = await renew();
    if (ok) token = 'gst_new';
    return ok;
  });
  return { api, createOrder, getOrder };
}

test('an expired guest session is renewed and the order is sent once more', async () => {
  const { api, createOrder } = setup(async () => true);
  await expect(api.createOrder({ lines: [] } as never, { idempotencyKey: 'k' })).resolves.toEqual({
    id: 'ord_1',
  });
  expect(createOrder).toHaveBeenCalledTimes(2);
});

test("when a new session can't start, the first error comes back", async () => {
  const { api, createOrder } = setup(async () => false);
  await expect(
    api.createOrder({ lines: [] } as never, { idempotencyKey: 'k' }),
  ).rejects.toMatchObject({ status: 401 });
  expect(createOrder).toHaveBeenCalledTimes(1);
});

test("reading an old order is not retried: a new session can't read the old visit", async () => {
  const renew = jest.fn(async () => true);
  const { api, getOrder } = setup(renew);
  await expect(api.getOrder('ord_1')).rejects.toMatchObject({ status: 401 });
  expect(getOrder).toHaveBeenCalledTimes(1);
  expect(renew).not.toHaveBeenCalled();
});
