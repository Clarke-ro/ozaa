import { isOwnerQuery, shouldPersistQuery } from '@/lib/queryPersist';
import { ownerKeys } from './keys';

// The menu is the guest's public menu, which the owner builder edits in place.
const { menu: _sharedMenu, ...owner } = ownerKeys;

test('sign-out catches every owner key', () => {
  for (const [name, make] of Object.entries(owner)) {
    expect([name, isOwnerQuery(make('v1'))]).toEqual([name, true]);
  }
});

test('no owner key is ever saved to the device', () => {
  for (const [name, make] of Object.entries(owner)) {
    expect([name, shouldPersistQuery(make('v1'), 'success')]).toEqual([name, false]);
  }
});
