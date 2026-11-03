import { isOwnerQuery, shouldPersistQuery } from './queryPersist';

describe('shouldPersistQuery', () => {
  it('keeps the venue and menu for offline use', () => {
    expect(shouldPersistQuery(['venue', 'mamas-kitchen'], 'success')).toBe(true);
    expect(shouldPersistQuery(['menu', 'mamas-kitchen'], 'success')).toBe(true);
  });

  it('never saves owner data or a guest loyalty card', () => {
    expect(shouldPersistQuery(['owner-loyalty-customers', 'v1', '024'], 'success')).toBe(false);
    expect(shouldPersistQuery(['owner-services', 'v1'], 'success')).toBe(false);
    expect(shouldPersistQuery(['loyalty', 'mamas-kitchen', 'tok'], 'success')).toBe(false);
    expect(shouldPersistQuery(['order', 'ord_1'], 'success')).toBe(false);
  });

  it('skips a venue query that has not loaded', () => {
    expect(shouldPersistQuery(['venue', 'mamas-kitchen'], 'pending')).toBe(false);
    expect(shouldPersistQuery(['venue', 'mamas-kitchen'], 'error')).toBe(false);
  });
});

describe('isOwnerQuery', () => {
  it('matches every owner key and nothing a guest reads', () => {
    expect(isOwnerQuery(['owner-orders', 'v1'])).toBe(true);
    expect(isOwnerQuery(['owner-business'])).toBe(true);
    expect(isOwnerQuery(['owner-services', 'v1'])).toBe(true);
    expect(isOwnerQuery(['venue', 'mamas-kitchen'])).toBe(false);
    expect(isOwnerQuery(['menu', 'mamas-kitchen'])).toBe(false);
    expect(isOwnerQuery([])).toBe(false);
  });
});
