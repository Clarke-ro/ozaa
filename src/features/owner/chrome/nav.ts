import type { StaffRole } from '@/features/orders';
import { PREVIEWS_ENABLED } from '@/lib/features';

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
  | 'settings'
  | 'categories'
  | 'notice'
  | 'customers'
  | 'promos'
  | 'integrations'
  | 'billing'
  | 'ordering'
  | 'sales';

// The sidebar groups, top to bottom. `personal` (your profile and settings) isn't in the list:
// it sits behind the owner button at the bottom of the sidebar, and in More on a phone.
export type NavGroup = 'main' | 'sales' | 'guests' | 'venue' | 'account' | 'personal' | 'previews';

export type OwnerNavItem = {
  id: OwnerNavId;
  href: string;
  roles: readonly StaffRole[];
  group: NavGroup;
  /** A roadmap preview on sample data. Only shown when PREVIEWS_ENABLED is true. */
  preview?: true;
  /** May be opened (from a link) but isn't listed: Setup is reached from "Complete your setup". */
  unlisted?: true;
};

const FRONT: readonly StaffRole[] = ['owner', 'manager', 'waiter'];
const DESK: readonly StaffRole[] = ['owner', 'manager'];
const ALL: readonly StaffRole[] = [
  'owner',
  'manager',
  'waiter',
  'kitchen',
  'viewer',
  'staff_scanner',
];

// Order here is the order in the sidebar and inside each More group.
export const OWNER_NAV: readonly OwnerNavItem[] = [
  {
    id: 'dashboard',
    href: '/owner',
    roles: ['owner', 'manager', 'waiter', 'viewer'],
    group: 'main',
  },
  {
    id: 'notifications',
    href: '/owner/notifications',
    // Kitchen staff see only their tickets (see nav.test.ts), so no feed for them.
    roles: ['owner', 'manager', 'waiter', 'viewer'],
    group: 'main',
  },
  { id: 'menu', href: '/owner/menu', roles: DESK, group: 'main' },
  { id: 'tables', href: '/owner/tables', roles: DESK, group: 'main' },
  { id: 'links', href: '/owner/links', roles: DESK, group: 'main' },
  { id: 'notice', href: '/owner/notice', roles: DESK, group: 'main' },
  { id: 'insights', href: '/owner/insights', roles: DESK, group: 'main' },
  {
    id: 'orders',
    href: '/owner/orders',
    roles: ['owner', 'manager', 'waiter', 'kitchen'],
    group: 'sales',
  },
  { id: 'sales', href: '/owner/sales', roles: DESK, group: 'sales' },
  { id: 'floor', href: '/owner/floor', roles: FRONT, group: 'sales' },
  { id: 'calls', href: '/owner/calls', roles: FRONT, group: 'sales' },
  {
    id: 'scan',
    href: '/owner/scan',
    roles: ['owner', 'manager', 'waiter', 'staff_scanner'],
    group: 'sales',
  },
  { id: 'promos', href: '/owner/promos', roles: DESK, group: 'sales' },
  { id: 'customers', href: '/owner/customers', roles: DESK, group: 'guests' },
  { id: 'loyalty', href: '/owner/loyalty', roles: FRONT, group: 'guests' },
  { id: 'feedback', href: '/owner/feedback', roles: DESK, group: 'guests' },
  { id: 'reviews', href: '/owner/reviews', roles: DESK, group: 'guests' },
  { id: 'business', href: '/owner/business', roles: ['owner'], group: 'venue' },
  { id: 'branding', href: '/owner/branding', roles: DESK, group: 'venue' },
  { id: 'services', href: '/owner/services', roles: DESK, group: 'venue' },
  { id: 'ordering', href: '/owner/ordering', roles: DESK, group: 'venue' },
  { id: 'socials', href: '/owner/socials', roles: DESK, group: 'venue' },
  { id: 'integrations', href: '/owner/integrations', roles: ['owner'], group: 'account' },
  { id: 'staff', href: '/owner/staff', roles: ['owner'], group: 'account' },
  { id: 'devices', href: '/owner/devices', roles: DESK, group: 'account' },
  { id: 'billing', href: '/owner/billing', roles: ['owner'], group: 'account' },
  // Everyone signed in has a profile; the page shows only the parts their role may change.
  { id: 'settings', href: '/owner/settings', roles: ALL, group: 'personal' },
  { id: 'setup', href: '/owner/setup', roles: ['owner'], group: 'account', unlisted: true },
  { id: 'stock', href: '/owner/stock', roles: DESK, group: 'previews', preview: true },
  { id: 'pos', href: '/owner/pos', roles: FRONT, group: 'previews', preview: true },
  { id: 'ai', href: '/owner/ai', roles: DESK, group: 'previews', preview: true },
  { id: 'marketing', href: '/owner/marketing', roles: DESK, group: 'previews', preview: true },
];

export const NAV_GROUPS: readonly NavGroup[] = [
  'main',
  'sales',
  'guests',
  'venue',
  'account',
  'personal',
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

/** Every listed page this person may open. Unlisted pages still open from links (see canOpen). */
export function navFor(role: StaffRole, previews: boolean = PREVIEWS_ENABLED): OwnerNavItem[] {
  return OWNER_NAV.filter(
    (item) => item.roles.includes(role) && !item.unlisted && (previews || !item.preview),
  );
}

export function tabsFor(role: StaffRole): OwnerNavItem[] {
  const allowed = navFor(role);
  return TABS[role].flatMap((id) => allowed.filter((item) => item.id === id));
}

export function moreGroups(role: StaffRole): { group: NavGroup; items: OwnerNavItem[] }[] {
  const tabs = new Set(TABS[role]);
  return navGroups(role, true)
    .map(({ group, items }) => ({
      group,
      items: items.filter((item) => !tabs.has(item.id)),
    }))
    .filter((entry) => entry.items.length > 0);
}

/**
 * The sidebar list, in groups. Empty groups are dropped. `personal` is left out by default:
 * the sidebar reaches it through the owner button; More on a phone lists it (withPersonal).
 */
export function navGroups(
  role: StaffRole,
  withPersonal = false,
): { group: NavGroup; items: OwnerNavItem[] }[] {
  const allowed = navFor(role);
  return NAV_GROUPS.filter((group) => withPersonal || group !== 'personal')
    .map((group) => ({
      group,
      items: allowed.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);
}

function matches(pathname: string, href: string): boolean {
  if (href === '/owner') return pathname === '/owner';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Tabs and More sit at the root of the stack, so they get no back button. A page opened from a
 * tab (one order under Orders) is not the tab itself, so it does.
 */
export function isTabRoot(role: StaffRole, pathname: string): boolean {
  if (pathname === '/owner/more') return true;
  return tabsFor(role).some((item) => pathname === item.href);
}

export function isCurrent(pathname: string, href: string): boolean {
  return matches(pathname, href);
}

// Pages every signed-in person may open: the More list, Help and their own profile.
const OPEN_TO_ALL = ['/owner/more', '/owner/help', '/owner/profile'];

/** Pages that moved. An old link keeps working for whoever may open the new page; its route redirects. */
const MOVED: Readonly<Record<string, string>> = {
  // The payout page went with the split model; payments are set up in Integrations (2026-11-08).
  '/owner/payments': '/owner/integrations',
  // Sections are edited on the Menu page (canvas redesign).
  '/owner/categories': '/owner/menu',
};

export function canOpen(role: StaffRole, pathname: string): boolean {
  const moved = MOVED[pathname];
  if (moved) return canOpen(role, moved);
  if (OPEN_TO_ALL.includes(pathname)) return true;
  const item = OWNER_NAV.find((entry) => matches(pathname, entry.href));
  // A page missing from OWNER_NAV stays closed until someone decides who may see it.
  if (!item) return false;
  return item.roles.includes(role);
}

/** Pages shown on their own, with no tab bar or sidebar, so the owner finishes one job. */
const FOCUSED: readonly string[] = ['/owner/setup'];

export function isFocused(pathname: string): boolean {
  return FOCUSED.includes(pathname);
}
