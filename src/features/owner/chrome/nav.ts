import type { StaffRole } from '@/features/orders';
import { PAYMENTS_ENABLED, PREVIEWS_ENABLED } from '@/lib/features';

export type OwnerNavId =
  | 'dashboard'
  | 'notifications'
  | 'floor'
  | 'orders'
  | 'calls'
  | 'menu'
  | 'loyalty'
  | 'feedback'
  | 'services'
  | 'payments'
  | 'reviews'
  | 'socials'
  | 'links'
  | 'tables'
  | 'branding'
  | 'staff'
  | 'insights'
  | 'setup'
  | 'stock'
  | 'pos'
  | 'ai'
  | 'marketing'
  | 'scan'
  | 'devices'
  | 'business'
  | 'settings';

export type NavGroup = 'service' | 'guestPage' | 'growth' | 'business' | 'previews';

export type OwnerNavItem = {
  id: OwnerNavId;
  href: string;
  roles: readonly StaffRole[];
  group: NavGroup;
  /** Only shown when PAYMENTS_ENABLED is true. */
  payments?: true;
  /** A roadmap preview on sample data. Only shown when PREVIEWS_ENABLED is true. */
  preview?: true;
};

const FRONT: readonly StaffRole[] = ['owner', 'manager', 'waiter'];
const DESK: readonly StaffRole[] = ['owner', 'manager'];

// Order here is the order in the sidebar and inside each More group.
export const OWNER_NAV: readonly OwnerNavItem[] = [
  {
    id: 'dashboard',
    href: '/owner',
    roles: ['owner', 'manager', 'waiter', 'viewer'],
    group: 'service',
  },
  {
    id: 'notifications',
    href: '/owner/notifications',
    // Kitchen staff see only their tickets (see nav.test.ts), so no feed for them.
    roles: ['owner', 'manager', 'waiter', 'viewer'],
    group: 'service',
  },
  { id: 'floor', href: '/owner/floor', roles: FRONT, group: 'service' },
  {
    id: 'orders',
    href: '/owner/orders',
    roles: ['owner', 'manager', 'waiter', 'kitchen'],
    group: 'service',
  },
  { id: 'calls', href: '/owner/calls', roles: FRONT, group: 'service' },
  {
    id: 'scan',
    href: '/owner/scan',
    roles: ['owner', 'manager', 'waiter', 'staff_scanner'],
    group: 'service',
  },
  { id: 'menu', href: '/owner/menu', roles: DESK, group: 'guestPage' },
  { id: 'tables', href: '/owner/tables', roles: DESK, group: 'guestPage' },
  { id: 'branding', href: '/owner/branding', roles: DESK, group: 'guestPage' },
  { id: 'services', href: '/owner/services', roles: DESK, group: 'guestPage' },
  { id: 'socials', href: '/owner/socials', roles: DESK, group: 'guestPage' },
  { id: 'links', href: '/owner/links', roles: DESK, group: 'guestPage' },
  { id: 'loyalty', href: '/owner/loyalty', roles: FRONT, group: 'growth' },
  { id: 'feedback', href: '/owner/feedback', roles: DESK, group: 'growth' },
  { id: 'reviews', href: '/owner/reviews', roles: DESK, group: 'growth' },
  { id: 'insights', href: '/owner/insights', roles: DESK, group: 'growth' },
  { id: 'payments', href: '/owner/payments', roles: ['owner'], group: 'business', payments: true },
  { id: 'staff', href: '/owner/staff', roles: ['owner'], group: 'business' },
  { id: 'devices', href: '/owner/devices', roles: DESK, group: 'business' },
  { id: 'business', href: '/owner/business', roles: ['owner'], group: 'business' },
  { id: 'setup', href: '/owner/setup', roles: ['owner'], group: 'business' },
  { id: 'settings', href: '/owner/settings', roles: DESK, group: 'business' },
  { id: 'stock', href: '/owner/stock', roles: DESK, group: 'previews', preview: true },
  {
    id: 'pos',
    href: '/owner/pos',
    roles: FRONT,
    group: 'previews',
    payments: true,
    preview: true,
  },
  { id: 'ai', href: '/owner/ai', roles: DESK, group: 'previews', preview: true },
  { id: 'marketing', href: '/owner/marketing', roles: DESK, group: 'previews', preview: true },
];

export const NAV_GROUPS: readonly NavGroup[] = [
  'service',
  'guestPage',
  'growth',
  'business',
  'previews',
];

// Four tabs at most, so "More" always fits as the fifth (HIG: 3 to 5 tabs).
// Owners and managers run the venue (menu, loyalty); waiters work the floor.
const TABS: Record<StaffRole, readonly OwnerNavId[]> = {
  owner: ['dashboard', 'orders', 'menu', 'loyalty'],
  manager: ['dashboard', 'orders', 'menu', 'loyalty'],
  waiter: ['dashboard', 'floor', 'orders', 'calls'],
  kitchen: ['orders'],
  viewer: ['dashboard'],
  staff_scanner: ['scan'],
};

export function navFor(
  role: StaffRole,
  payments: boolean = PAYMENTS_ENABLED,
  previews: boolean = PREVIEWS_ENABLED,
): OwnerNavItem[] {
  return OWNER_NAV.filter(
    (item) =>
      item.roles.includes(role) && (payments || !item.payments) && (previews || !item.preview),
  );
}

export function tabsFor(role: StaffRole): OwnerNavItem[] {
  const allowed = navFor(role);
  return TABS[role].flatMap((id) => allowed.filter((item) => item.id === id));
}

export function moreGroups(role: StaffRole): { group: NavGroup; items: OwnerNavItem[] }[] {
  const tabs = new Set(TABS[role]);
  const rest = navFor(role).filter((item) => !tabs.has(item.id));
  return NAV_GROUPS.map((group) => ({
    group,
    items: rest.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

function matches(pathname: string, href: string): boolean {
  if (href === '/owner') return pathname === '/owner';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Tabs and More sit at the root of the stack, so they get no back button. */
export function isTabRoot(role: StaffRole, pathname: string): boolean {
  if (pathname === '/owner/more') return true;
  return tabsFor(role).some((item) => matches(pathname, item.href));
}

export function isCurrent(pathname: string, href: string): boolean {
  return matches(pathname, href);
}

export function canOpen(role: StaffRole, pathname: string): boolean {
  if (pathname === '/owner/more') return true;
  const item = OWNER_NAV.find((entry) => matches(pathname, entry.href));
  if (!item) return true;
  return item.roles.includes(role);
}
