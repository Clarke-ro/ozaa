import { canOpen, isFocused, isTabRoot, moreGroups, navFor, navGroups, tabsFor } from './nav';

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

test('with previews on, the owner sees Integrations, the till and staff', () => {
  const ids = navFor('owner', true).map((item) => item.id);
  expect(ids).toContain('integrations');
  expect(ids).toContain('pos');
  expect(ids).toContain('staff');
  expect(ids).toContain('setup');
});

test('the old payout page is gone: payments are set up in Integrations', () => {
  for (const role of ['owner', 'manager', 'waiter', 'kitchen', 'viewer'] as const) {
    expect(navFor(role, true).map((item) => item.id as string)).not.toContain('payments');
  }
});

test('with previews off, nobody sees the sample-data screens', () => {
  for (const role of ['owner', 'manager', 'waiter'] as const) {
    const ids = navFor(role, false).map((item) => item.id);
    for (const preview of ['stock', 'pos', 'ai', 'marketing']) {
      expect(ids).not.toContain(preview);
    }
  }
  expect(navFor('owner', true).map((item) => item.id)).toEqual(
    expect.arrayContaining(['stock', 'ai', 'marketing']),
  );
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

describe('sidebar groups', () => {
  test('the owner sidebar runs Main, then Sales, then Settings', () => {
    const groups = navGroups('owner').map((entry) => entry.group);
    expect(groups).toEqual(['main', 'sales', 'settings']);
  });

  test('each group holds the pages the owner expects there', () => {
    const byGroup = Object.fromEntries(
      navGroups('owner').map((entry) => [entry.group, entry.items.map((item) => item.id)]),
    );
    expect(byGroup.main).toEqual(
      expect.arrayContaining(['dashboard', 'menu', 'categories', 'tables', 'insights', 'notice']),
    );
    expect(byGroup.sales).toEqual(
      expect.arrayContaining(['orders', 'floor', 'customers', 'loyalty', 'promos']),
    );
    expect(byGroup.settings).toEqual(
      expect.arrayContaining([
        'business',
        'branding',
        'integrations',
        'staff',
        'billing',
        'settings',
      ]),
    );
  });

  test('only the owner sees billing and integrations', () => {
    for (const role of ['manager', 'waiter', 'kitchen', 'viewer'] as const) {
      const ids = navFor(role).map((item) => item.id);
      expect(ids).not.toContain('billing');
      expect(ids).not.toContain('integrations');
    }
  });

  test('the sidebar and More list every allowed page exactly once', () => {
    for (const role of ['owner', 'manager', 'waiter', 'kitchen'] as const) {
      const ids = navGroups(role).flatMap((entry) => entry.items.map((item) => item.id));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(navFor(role).length);
    }
  });
});

describe('canOpen', () => {
  it('lets a role open the pages its nav lists, and nested pages under them', () => {
    expect(canOpen('kitchen', '/owner/orders')).toBe(true);
    expect(canOpen('kitchen', '/owner/orders/abc')).toBe(true);
    expect(canOpen('kitchen', '/owner/menu')).toBe(false);
  });

  it('keeps More and Help open to every role', () => {
    expect(canOpen('kitchen', '/owner/more')).toBe(true);
    expect(canOpen('staff_scanner', '/owner/help')).toBe(true);
  });

  it('blocks owner pages the nav does not know about', () => {
    expect(canOpen('waiter', '/owner/secret')).toBe(false);
  });
});

test('an old link to a moved page has the access of where it moved to', () => {
  // /owner/payments became Integrations (owner only), and its route redirects there.
  expect(canOpen('owner', '/owner/payments')).toBe(true);
  expect(canOpen('manager', '/owner/payments')).toBe(false);
  expect(canOpen('waiter', '/owner/payments')).toBe(false);
});

test('setup is a focused flow: no tab bar or sidebar, on any screen size', () => {
  expect(isFocused('/owner/setup')).toBe(true);
  expect(isFocused('/owner')).toBe(false);
  expect(isFocused('/owner/integrations')).toBe(false);
});
