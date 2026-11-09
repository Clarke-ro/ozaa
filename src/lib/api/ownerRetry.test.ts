import type { ApiClient } from './client';
import { ApiError } from './errors';
import { withOwnerRetry } from './ownerRetry';

const expired = () => new ApiError(401, 'unauthorized', 'Sign in again');

/** A client with just the calls a test needs; the rest are never touched. */
function fake(calls: Partial<ApiClient>): ApiClient {
  return calls as ApiClient;
}

test('an owner call that gets 401 asks for a new token once, then tries again', async () => {
  let token = 'old';
  const base = fake({
    ownerGetDashboard: async () => {
      if (token === 'old') throw expired();
      return { sample: true } as never;
    },
  });
  const onUnauthorized = jest.fn(async () => {
    token = 'new';
    return true;
  });
  const api = withOwnerRetry(base, () => onUnauthorized);
  await expect(api.ownerGetDashboard('ven_1')).resolves.toEqual({ sample: true });
  expect(onUnauthorized).toHaveBeenCalledTimes(1);
});

test('when no new token comes, the 401 reaches the screen', async () => {
  const base = fake({
    ownerGetDashboard: async () => {
      throw expired();
    },
  });
  const api = withOwnerRetry(base, () => async () => false);
  await expect(api.ownerGetDashboard('ven_1')).rejects.toMatchObject({ status: 401 });
});

test('a second 401 after a new token is not retried again', async () => {
  const call = jest.fn(async () => {
    throw expired();
  });
  const api = withOwnerRetry(fake({ ownerGetDashboard: call }), () => async () => true);
  await expect(api.ownerGetDashboard('ven_1')).rejects.toMatchObject({ status: 401 });
  expect(call).toHaveBeenCalledTimes(2);
});

test('guest calls and other errors pass straight through', async () => {
  const onUnauthorized = jest.fn(async () => true);
  const api = withOwnerRetry(
    fake({
      getOrder: async () => {
        throw expired();
      },
      ownerGetDashboard: async () => {
        throw new ApiError(403, 'forbidden', 'No');
      },
    }),
    () => onUnauthorized,
  );
  await expect(api.getOrder('ord_1')).rejects.toMatchObject({ status: 401 });
  await expect(api.ownerGetDashboard('ven_1')).rejects.toMatchObject({ status: 403 });
  expect(onUnauthorized).not.toHaveBeenCalled();
});
