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
  Promo,
  StaffPrefs,
  TaxSetup,
  LoyaltyScanLogEntry,
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

import type { HandledBy } from '@/lib/sales';

/** The shape of the mock's in-memory world. */

export type LiveOrder = {
  order: Order;
  receivedAt: number;
  manual: boolean;
  /** Who took or served it, for Sales "by staff". Guest orders nobody touched have none. */
  handledBy?: HandledBy;
};

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
  written: (WrittenReview & { venueId: string })[];
  transactions: (VenueTransaction & { venueId: string })[];
  loyalty: Record<string, VenueLoyalty>;
  staff: (StaffMember & { venueId: string; phone: string })[];
  tables: Record<string, Table[]>;
  feedback: (FeedbackItem & { venueId: string })[];
  customLinks: (CustomLink & { venueId: string })[];
  business: { business: Business; locations: Location[] };
  devices: (ScannerDevice & { venueId: string })[];
  /** E-VAT setup by venue id. Kept off the public venue: the TIN is the owner's business. */
  tax: Record<string, TaxSetup>;
  /** Owner-only, by venue id: the WhatsApp number for order alerts. Never on the public venue. */
  whatsappAlerts: Record<string, string | null>;
  promos: (Promo & { venueId: string })[];
  /** Venues that switched off the automatic stamp on paid orders. */
  noAutoStamp: Set<string>;
  /** Notification ids each staff member (by phone) has read. */
  notificationReads: Map<string, Set<string>>;
  scanLog: (LoyaltyScanLogEntry & { venueId: string })[];
  /** Profile extras by staff phone: the parts StaffMember doesn't hold. */
  profiles: Map<
    string,
    {
      firstName: string;
      lastName: string | null;
      email: string | null;
      photo: import('@/lib/api/types').Image | null;
      /** The number after a confirmed change. Sign-in still uses the original in the mock. */
      phone: string;
      prefs: StaffPrefs;
    }
  >;
  /** Pending phone changes: new number by current phone. */
  phoneChanges: Map<string, string>;
  quotes: Map<
    string,
    {
      orderId: string;
      share: number;
      tip: number;
      /** The Paystack fee passed to the guest; not part of the bill. */
      fee: number;
      lineIds: string[];
      expiresAt: number;
    }
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
    {
      slug: string;
      tableCode: string | null;
      orderId: string | null;
      startedAt: string;
      /** First time this visit opened the menu (Insights funnel). */
      menuOpenedAt?: string;
      /** When this visit placed its first order. */
      orderedAt?: string;
    }
  >;
  access: Map<string, { phone: string; purpose: 'owner_login' | 'guest_loyalty' }>;
  refresh: Map<string, string>;
  seq: number;
};
