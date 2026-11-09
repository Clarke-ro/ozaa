import {
  canPayOnline,
  checkManualPayments,
  checkPaystackKeys,
  guestPayMethods,
  keyHint,
} from './payments';

const pk = 'pk_test_abcdef1234567890';
const sk = 'sk_test_abcdef1234567890';

describe('checkPaystackKeys', () => {
  test('test keys in test mode are fine', () => {
    expect(checkPaystackKeys({ mode: 'test', publicKey: pk, secretKey: sk }, false)).toEqual({
      ok: true,
    });
  });
  test('a key that is not a Paystack key is refused', () => {
    expect(checkPaystackKeys({ mode: 'test', publicKey: 'hello', secretKey: sk }, false)).toEqual({
      ok: false,
      code: 'paystack_keys_invalid',
    });
  });
  test('the keys must match the mode, and each other', () => {
    expect(checkPaystackKeys({ mode: 'live', publicKey: pk, secretKey: sk }, true)).toEqual({
      ok: false,
      code: 'paystack_mode_mismatch',
    });
    expect(
      checkPaystackKeys(
        { mode: 'test', publicKey: pk, secretKey: 'sk_live_abcdef1234567890' },
        true,
      ),
    ).toEqual({ ok: false, code: 'paystack_mode_mismatch' });
  });
  test('the public and secret keys must not be swapped', () => {
    expect(checkPaystackKeys({ mode: 'test', publicKey: sk, secretKey: pk }, false)).toEqual({
      ok: false,
      code: 'paystack_keys_invalid',
    });
  });
  test('live keys are refused until live payments are switched on', () => {
    const live = {
      mode: 'live' as const,
      publicKey: 'pk_live_abcdef1234567890',
      secretKey: 'sk_live_abcdef1234567890',
    };
    expect(checkPaystackKeys(live, false)).toEqual({ ok: false, code: 'live_not_enabled' });
    expect(checkPaystackKeys(live, true)).toEqual({ ok: true });
  });
  test('spaces pasted around a key are not part of it', () => {
    expect(
      checkPaystackKeys({ mode: 'test', publicKey: ` ${pk} `, secretKey: `${sk}\n` }, false),
    ).toEqual({ ok: true });
  });
});

test('the hint shows only the last 4 characters', () => {
  expect(keyHint('sk_test_abcdef1234567890')).toBe('••••7890');
});

const manual = {
  cash: true,
  cardMachine: false,
  bankTransfer: { enabled: false },
  momo: { enabled: false },
};

describe('checkManualPayments', () => {
  test('cash alone is fine', () => {
    expect(checkManualPayments(manual)).toEqual({ ok: true });
  });
  test('bank transfer on needs the account name and number', () => {
    expect(
      checkManualPayments({ ...manual, bankTransfer: { enabled: true, accountName: 'Mama' } }),
    ).toEqual({
      ok: false,
      field: 'bank',
    });
  });
  test('MoMo on needs a network and a valid number', () => {
    expect(
      checkManualPayments({ ...manual, momo: { enabled: true, network: 'mtn', number: '+23324' } }),
    ).toEqual({
      ok: false,
      field: 'momo',
    });
    expect(
      checkManualPayments({
        ...manual,
        momo: { enabled: true, network: 'mtn', number: '+233241234567', name: 'Mama' },
      }),
    ).toEqual({ ok: true });
  });
});

describe('guestPayMethods', () => {
  test('without Paystack, guests pay in person; details show only for methods that are on', () => {
    expect(
      guestPayMethods({
        paystack: null,
        manual: {
          ...manual,
          bankTransfer: { enabled: false, accountName: 'Mama', accountNumber: '123' },
          momo: { enabled: true, network: 'mtn', number: '+233241234567', name: 'Mama K' },
        },
      }),
    ).toEqual({
      online: false,
      testMode: false,
      cash: true,
      cardMachine: false,
      bankTransfer: null,
      momo: { network: 'mtn', number: '+233241234567', name: 'Mama K' },
    });
  });
  test('with Paystack connected, guests can pay online, and test mode is flagged', () => {
    const methods = guestPayMethods({
      paystack: {
        mode: 'test',
        publicKey: pk,
        secretKeyHint: '••••7890',
        connectedAt: '2026-11-04T10:00:00Z',
      },
      manual,
    });
    expect(methods.online).toBe(true);
    expect(methods.testMode).toBe(true);
    expect(JSON.stringify(methods)).not.toContain('sk_');
  });
});

describe('canPayOnline', () => {
  test('only when the venue says its own Paystack is connected', () => {
    expect(canPayOnline(undefined)).toBe(false);
    expect(canPayOnline({})).toBe(false);
    const methods = { online: false, cash: true, cardMachine: false };
    expect(canPayOnline({ payMethods: methods })).toBe(false);
    expect(canPayOnline({ payMethods: { ...methods, online: true } })).toBe(true);
  });
});
