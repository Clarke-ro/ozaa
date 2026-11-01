import type { StaffRole } from '@/features/orders';

export type OwnerNavId =
  | 'dashboard'
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

export type OwnerNavItem = {
  id: OwnerNavId;
  href: string;
  roles: readonly StaffRole[];
  phone?: boolean;
};

const ALL: readonly StaffRole[] = ['owner', 'manager', 'waiter', 'kitchen'];
const FRONT: readonly StaffRole[] = ['owner', 'manager', 'waiter'];
const DESK: readonly StaffRole[] = ['owner', 'manager'];

export const OWNER_NAV: readonly OwnerNavItem[] = [
  { id: 'dashboard', href: '/owner', roles: ['owner', 'manager', 'waiter', 'viewer'], phone: true },
  { id: 'floor', href: '/owner/floor', roles: FRONT, phone: true },
  { id: 'orders', href: '/owner/orders', roles: ['owner', 'manager', 'waiter', 'kitchen'], phone: true },
  { id: 'calls', href: '/owner/calls', roles: FRONT, phone: true },
  { id: 'menu', href: '/owner/menu', roles: DESK },
  { id: 'loyalty', href: '/owner/loyalty', roles: FRONT },
  { id: 'feedback', href: '/owner/feedback', roles: DESK },
  { id: 'services', href: '/owner/services', roles: DESK },
  { id: 'payments', href: '/owner/payments', roles: ['owner'] },
  { id: 'reviews', href: '/owner/reviews', roles: DESK },
  { id: 'socials', href: '/owner/socials', roles: DESK },
  { id: 'links', href: '/owner/links', roles: DESK },
  { id: 'tables', href: '/owner/tables', roles: DESK },
  { id: 'branding', href: '/owner/branding', roles: DESK },
  { id: 'staff', href: '/owner/staff', roles: ['owner'] },
  { id: 'insights', href: '/owner/insights', roles: DESK },
  { id: 'setup', href: '/owner/setup', roles: ['owner'] },
  { id: 'stock', href: '/owner/stock', roles: DESK },
  { id: 'pos', href: '/owner/pos', roles: FRONT },
  { id: 'ai', href: '/owner/ai', roles: DESK },
  { id: 'marketing', href: '/owner/marketing', roles: DESK },
  { id: 'scan', href: '/owner/scan', roles: ['owner', 'manager', 'waiter', 'staff_scanner'] },
  { id: 'devices', href: '/owner/devices', roles: ['owner', 'manager'] },
  { id: 'business', href: '/owner/business', roles: ['owner'] },
  { id: 'settings', href: '/owner/settings', roles: ['owner', 'manager'] },
];

export function navFor(role: StaffRole): OwnerNavItem[] {
  return OWNER_NAV.filter((item) => item.roles.includes(role));
}

export function phoneNav(role: StaffRole): OwnerNavItem[] {
  return navFor(role).filter((item) => item.phone);
}

export function canOpen(role: StaffRole, pathname: string): boolean {
  if (pathname === '/owner/more') return true;
  const item = OWNER_NAV.find((entry) => (entry.href === '/owner' ? pathname === '/owner' : pathname === entry.href || pathname.startsWith(`${entry.href}/`)));
  if (!item) return true;
  return item.roles.includes(role);
}
