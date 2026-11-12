import type { VenueLoyalty } from '../features/loyalty/facts';
import type {
  Business,
  CustomLink,
  FeedbackItem,
  Location,
  Menu,
  Offer,
  Order,
  PaymentSettings,
  ScannerDevice,
  StaffMember,
  StoreNotices,
  Table,
  VenuePublic,
  VenueTransaction,
  WaiterCall,
  Wifi,
  WrittenReview,
} from '@/lib/api/types';

/** The shape of the mock's in-memory world. */

export type LiveOrder = { order: Order; receivedAt: number; manual: boolean };

export type World = {
  venues: Record<string, VenuePublic>;
  menus: Record<string, Menu>;
  wifi: Record<string, Wifi>;
  /** Store notices as the owner set them, by venue slug. Guests only get the live ones. */
  notices: Record<string, StoreNotices>;
  /** Payment settings by venue id. Like the real server, never the secret key itself. */
  paymentSettings: Record<string, PaymentSettings>;
  offers: Record<string, Offer[]>;
  orders: LiveOrder[];
  calls: (WaiterCall & { venueId: string })[];
  seatedCodes: Record<string, string[]>;
  yesterdayPesewas: Record<string, number>;
  written: (WrittenReview & { venueId: string })[];
  transactions: (VenueTransaction & { venueId: string })[];
  loyalty: Record<string, VenueLoyalty>;
  staff: (StaffMember & { venueId: string; phone: string })[];
  tables: Record<string, Table[]>;
  feedback: (FeedbackItem & { venueId: string })[];
  customLinks: (CustomLink & { venueId: string })[];
  business: { business: Business; locations: Location[] };
  devices: (ScannerDevice & { venueId: string })[];
  quotes: Map<
    string,
    { orderId: string; share: number; tip: number; lineIds: string[]; expiresAt: number }
  >;
  payments: Map<
    string,
    {
      payment: import('@/lib/api/types').Payment;
      phone: string;
      applied: boolean;
      /** The quote this payment pays: which dishes get marked paid when it succeeds. */
      quoteId?: string;
    }
  >;
  idempotency: Map<string, unknown>;
  otpFails: Map<string, number>;
  sessions: Map<
    string,
    { slug: string; tableCode: string | null; orderId: string | null; startedAt: string }
  >;
  /** Sample visits already counted today, so the demo isn't empty. Real visits add to it. */
  visitorBase: Record<string, number>;
  access: Map<string, { phone: string; purpose: 'owner_login' | 'guest_loyalty' }>;
  refresh: Map<string, string>;
  seq: number;
};
