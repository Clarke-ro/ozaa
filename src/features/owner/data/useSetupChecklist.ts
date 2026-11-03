import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { setupChecklist, type SetupChecklist } from '../desk/setupChecklist';
import { ownerKeys } from './keys';

/**
 * The setup checklist, built from the venue, menu, tables and staff the owner screens already
 * load (same cache keys), so it costs no extra calls once those screens have been opened.
 * Null until all four have loaded.
 */
export function useSetupChecklist(venueId: string): SetupChecklist | null {
  const enabled = Boolean(venueId);
  const venue = useQuery({
    queryKey: ownerKeys.venue(venueId),
    queryFn: () => api.ownerGetVenue(venueId),
    enabled,
  });
  const slug = venue.data?.slug ?? '';
  const menu = useQuery({
    queryKey: ownerKeys.menu(slug),
    queryFn: () => api.getMenu(slug),
    enabled: Boolean(slug),
  });
  const tables = useQuery({
    queryKey: ownerKeys.tables(venueId),
    queryFn: () => api.ownerListTables(venueId),
    enabled,
  });
  const staff = useQuery({
    queryKey: ownerKeys.staff(venueId),
    queryFn: () => api.ownerListStaff(venueId),
    enabled,
  });
  const v = venue.data;
  if (!v || !menu.data || !tables.data || !staff.data) return null;
  return setupChecklist({
    hasDescription: v.description.en.trim().length > 0,
    hasLocation: v.location.label.trim().length > 0,
    hasLogo: v.logo != null,
    dishCount: menu.data.items.length,
    tableCount: tables.data.items.length,
    hasWifi: Boolean(v.wifi?.ssid),
    staffCount: staff.data.items.length,
  });
}
