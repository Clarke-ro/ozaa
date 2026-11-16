import { alertsPatch } from './whatsappAlerts';

describe('alertsPatch', () => {
  it('turns alerts off with null, whatever is typed', () => {
    expect(alertsPatch(false, 'nonsense')).toEqual({ ok: true, patch: { whatsappAlerts: null } });
  });

  it('saves a Ghana number typed the local way in full international form', () => {
    expect(alertsPatch(true, '024 123 4567')).toEqual({
      ok: true,
      patch: { whatsappAlerts: '+233241234567' },
    });
  });

  it('refuses a number that is too short or empty', () => {
    expect(alertsPatch(true, '024 123')).toEqual({ ok: false });
    expect(alertsPatch(true, '')).toEqual({ ok: false });
  });
});
