import { isTabRoot, moreGroups, navFor, tabsFor } from './nav';

test('kitchen only sees the order tickets', () => {
  expect(navFor('kitchen').map((item) => item.id)).toEqual(['orders']);
});

test('a waiter sees the floor, tickets and calls, and not payouts', () => {
  const ids = navFor('waiter').map((item) => item.id);
  expect(ids).toContain('floor');
  expect(ids).toContain('calls');
  expect(ids).not.toContain('payments');
  expect(ids).not.toContain('staff');
});

test('a manager sees the venue tools except payouts and staff', () => {
  const ids = navFor('manager').map((item) => item.id);
  expect(ids).toContain('menu');
  expect(ids).toContain('insights');
  expect(ids).not.toContain('payments');
  expect(ids).not.toContain('staff');
});

test('with payments on, the owner sees payouts and staff', () => {
  const ids = navFor('owner', true).map((item) => item.id);
  expect(ids).toContain('payments');
  expect(ids).toContain('pos');
  expect(ids).toContain('staff');
  expect(ids).toContain('setup');
});

test('with payments off, nobody sees payments or the counter till', () => {
  for (const role of ['owner', 'manager', 'waiter'] as const) {
    const ids = navFor(role, false).map((item) => item.id);
    expect(ids).not.toContain('payments');
    expect(ids).not.toContain('pos');
  }
  expect(navFor('owner', false).map((item) => item.id)).toContain('staff');
});

describe('phone tabs', () => {
  test('owners get their main jobs as tabs: today, orders, menu, loyalty', () => {
    expect(tabsFor('owner').map((item) => item.id)).toEqual([
      'dashboard',
      'orders',
      'menu',
      'loyalty',
    ]);
  });

  test('waiters get the floor and calls as tabs', () => {
    expect(tabsFor('waiter').map((item) => item.id)).toEqual([
      'dashboard',
      'floor',
      'orders',
      'calls',
    ]);
  });

  test('never more than four tabs, so More always fits as the fifth', () => {
    for (const role of [
      'owner',
      'manager',
      'waiter',
      'kitchen',
      'viewer',
      'staff_scanner',
    ] as const) {
      expect(tabsFor(role).length).toBeLessThanOrEqual(4);
    }
  });

  test('a tab is only offered to roles that can open it', () => {
    for (const role of [
      'owner',
      'manager',
      'waiter',
      'kitchen',
      'viewer',
      'staff_scanner',
    ] as const) {
      for (const tab of tabsFor(role)) expect(tab.roles).toContain(role);
    }
  });
});

describe('More screen groups', () => {
  test('lists everything the role can open that is not already a tab, once', () => {
    const groups = moreGroups('owner');
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    const tabs = tabsFor('owner').map((item) => item.id);
    expect(ids.some((id) => tabs.includes(id))).toBe(false);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids, ...tabs].sort()).toEqual(
      navFor('owner')
        .map((item) => item.id)
        .sort(),
    );
  });

  test('drops empty groups', () => {
    expect(moreGroups('kitchen').every((group) => group.items.length > 0)).toBe(true);
  });
});

describe('isTabRoot', () => {
  test('a tab and More have no back button; detail screens do', () => {
    expect(isTabRoot('owner', '/owner')).toBe(true);
    expect(isTabRoot('owner', '/owner/menu')).toBe(true);
    expect(isTabRoot('owner', '/owner/more')).toBe(true);
    expect(isTabRoot('owner', '/owner/branding')).toBe(false);
    expect(isTabRoot('waiter', '/owner/menu')).toBe(false);
  });
});
