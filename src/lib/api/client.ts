import type {
  BillQuote,
  BillQuoteRequest,
  Business,
  Call,
  ConsentInput,
  CreateOrderRequest,
  CustomLink,
  CustomLinkInput,
  FeedbackItem,
  FloorTable,
  GuestSession,
  InitializePaymentRequest,
  InsightsReport,
  Location,
  LocationInput,
  LocationPatchInput,
  LoyaltyAnalyticsReport,
  LoyaltyCard,
  LoyaltyCustomerSummary,
  LoyaltyProgram,
  LoyaltyScanResult,
  Menu,
  OwnerCreateOrderRequest,
  SalesReport,
  ManualPaymentMethod,
  ManualPayments,
  FeePassing,
  PaymentSettings,
  PaystackKeysInput,
  MenuCategory,
  MenuCategoryInput,
  MenuItem,
  MenuItemInput,
  Offer,
  Order,
  OtpPurpose,
  LoyaltyToken,
  OwnerDashboard,
  Payment,
  ScannerDevice,
  ServiceSettings,
  StaffMember,
  StaffRole,
  StaffUser,
  Table,
  ThemeInput,
  VenuePublic,
  VenueSettings,
  VenueSettingsPatch,
  VenueTheme,
  VenueTransaction,
  WaiterCall,
  WaiterReason,
  Wifi,
  WrittenReview,
  Currency,
  BusinessPatch,
  CustomerTag,
  LoyaltyCustomerDetail,
  LoyaltyScanLogEntry,
  OwnerNotification,
  OwnerNotificationKind,
  Promo,
  PromoInput,
  PromoPatch,
  StaffProfilePatch,
} from './types';

/** What a waiter-call update sends: a status, a reply the guest sees (it also resolves), or a snooze. */
export type WaiterCallUpdate = {
  status?: 'acknowledged' | 'resolved';
  reply?: string;
  snoozeMinutes?: number;
};

export type NotificationPage = {
  items: OwnerNotification[];
  unreadCount: number;
  countsByKind: Record<string, number>;
  nextCursor?: string | null;
};

export type TokenSource = {
  guest: () => string | null;
  access: () => string | null;
  loyalty?: () => string | null;
};

export type ApiClient = {
  requestOtp(
    body: { phone: string; purpose: OtpPurpose },
    call?: Call,
  ): Promise<{ expiresInSeconds: number; resendInSeconds: number }>;
  verifyOtp(body: { phone: string; code: string; purpose: OtpPurpose }): Promise<LoyaltyToken>;
  getMe(): Promise<StaffUser>;
  createGuestSession(body: {
    venueSlug: string;
    tableCode?: string;
    language?: 'en' | 'tw' | 'ga' | 'ee' | 'fr';
  }): Promise<GuestSession>;
  getVenue(slug: string, call?: Call): Promise<VenuePublic>;
  getMenu(slug: string, call?: Call): Promise<Menu>;
  getWifi(slug: string): Promise<Wifi>;
  listOffers(slug: string): Promise<{ items: Offer[] }>;
  createOrder(body: CreateOrderRequest, call: Call): Promise<Order>;
  getOrder(orderId: string, call?: Call): Promise<Order>;
  quoteBill(orderId: string, body: BillQuoteRequest): Promise<BillQuote>;
  initializePayment(body: InitializePaymentRequest, call: Call): Promise<Payment>;
  getPayment(reference: string): Promise<Payment>;
  verifyPayment(reference: string): Promise<Payment>;
  callWaiter(body: { reason: WaiterReason; note?: string }, call: Call): Promise<WaiterCall>;
  getWaiterCall(id: string): Promise<WaiterCall>;
  getVenueLoyaltyProgram(slug: string): Promise<LoyaltyProgram>;
  getMyLoyaltyCard(slug: string): Promise<LoyaltyCard>;
  joinLoyalty(
    slug: string,
    body: { firstName?: string; birthdayMonthDay?: string; consent: ConsentInput },
  ): Promise<LoyaltyCard>;
  leaveLoyalty(slug: string): Promise<void>;
  redeemReward(
    slug: string,
    body: { rewardId: string; orderId?: string },
    call: Call,
  ): Promise<LoyaltyCard>;
  createReview(
    body: {
      stars: number;
      highlights?: ('food' | 'service' | 'speed' | 'value' | 'vibe' | 'cleanliness')[];
      text?: string;
      orderId?: string;
    },
    call: Call,
  ): Promise<{ id: string; googleReviewUrl: string | null }>;
  getLeaderboard(slug: string): Promise<{
    period: string;
    entries: { rank: number; nickname: string; score: number; sample?: boolean }[];
    stampRule: { enabled: boolean; minScore: number };
  }>;
  submitScore(
    slug: string,
    body: { score: number; runId: string; durationMs: number; nickname?: string },
    call?: Call,
  ): Promise<{ rank: number | null; stampEarned: boolean }>;
  sendFeedback(body: { message: string; contactPhone?: string }): Promise<void>;
  ownerGetVenue(venueId: string): Promise<VenueSettings>;
  ownerUpdateVenue(venueId: string, body: VenueSettingsPatch): Promise<VenueSettings>;
  ownerSetTheme(venueId: string, body: ThemeInput): Promise<VenueTheme>;
  ownerCreateMediaUpload(
    venueId: string,
    body: { kind: 'banner' | 'logo' | 'dish_photo'; contentType: string; sizeBytes: number },
  ): Promise<{ mediaId: string; uploadUrl: string; expiresAt: string }>;
  ownerGetServices(venueId: string): Promise<ServiceSettings>;
  ownerSetServices(venueId: string, body: ServiceSettings): Promise<ServiceSettings>;
  ownerListStaff(venueId: string): Promise<{ items: StaffMember[] }>;
  ownerInviteStaff(
    venueId: string,
    body: { phone: string; role: StaffRole; firstName: string; email?: string },
  ): Promise<StaffMember>;
  ownerRevokeStaff(venueId: string, staffId: string): Promise<void>;
  /** Owner only. The owner's own role can't change, and nobody can be made owner (409). */
  ownerUpdateStaff(
    venueId: string,
    staffId: string,
    body: { role?: Exclude<StaffRole, 'owner'>; tableCodes?: string[] },
  ): Promise<StaffMember>;
  /** "End shift": signs them out on every device. */
  ownerSignOutStaff(venueId: string, staffId: string): Promise<void>;
  /** Clears their PIN; they sign in with an SMS code next time and set a new one. */
  ownerResetStaffPin(venueId: string, staffId: string): Promise<void>;
  ownerListCategories(venueId: string): Promise<{ items: MenuCategory[] }>;
  ownerCreateCategory(venueId: string, body: MenuCategoryInput): Promise<MenuCategory>;
  ownerUpdateCategory(
    venueId: string,
    categoryId: string,
    body: MenuCategoryInput,
  ): Promise<MenuCategory>;
  ownerDeleteCategory(venueId: string, categoryId: string): Promise<void>;
  ownerCreateItem(venueId: string, body: MenuItemInput): Promise<MenuItem>;
  ownerUpdateItem(venueId: string, itemId: string, body: MenuItemInput): Promise<MenuItem>;
  ownerDeleteItem(venueId: string, itemId: string): Promise<void>;
  ownerListTables(venueId: string): Promise<{ items: Table[] }>;
  ownerCreateTables(venueId: string, body: { codes: string[] }): Promise<{ items: Table[] }>;
  ownerGetTableQr(
    venueId: string,
    tableId: string,
    format?: 'svg' | 'png' | 'pdf',
  ): Promise<string>;
  /**
   * `since` (inclusive) and `until` (exclusive) are ISO times; leave both out for the newest orders.
   * `updatedSince` asks only for orders changed since then. `live` keeps the ones still in the kitchen.
   */
  ownerListOrders(
    venueId: string,
    filter?: { since?: string; until?: string; updatedSince?: string; live?: boolean },
  ): Promise<{ items: Order[]; nextCursor?: string | null }>;
  /** One order. Use this for the order page, including orders older than the newest 300. */
  ownerGetOrder(orderId: string): Promise<Order>;
  ownerCreateOrder(venueId: string, body: OwnerCreateOrderRequest, call: Call): Promise<Order>;
  ownerSetOrderStatus(
    orderId: string,
    body: { status: Order['status']; cancelReason?: string },
  ): Promise<Order>;
  /** Open calls by default (snoozed ones hidden). open false with since gives the day's history. */
  ownerListWaiterCalls(
    venueId: string,
    query?: { open?: boolean; since?: string },
  ): Promise<{ items: WaiterCall[] }>;
  ownerUpdateWaiterCall(id: string, body: WaiterCallUpdate): Promise<WaiterCall>;
  ownerGetLoyalty(venueId: string): Promise<LoyaltyProgram>;
  ownerSetLoyalty(venueId: string, body: LoyaltyProgram): Promise<LoyaltyProgram>;
  ownerListLoyaltyMembers(
    venueId: string,
  ): Promise<{ items: LoyaltyCard[]; nextCursor?: string | null }>;
  ownerConfirmRedemption(
    venueId: string,
    body: { code: string },
    call?: Call,
  ): Promise<LoyaltyCard>;
  ownerGetLoyaltyAnalytics(
    venueId: string,
    range?: '7d' | '30d' | '90d',
  ): Promise<LoyaltyAnalyticsReport>;
  ownerListLoyaltyCustomers(
    venueId: string,
    query?: { search?: string; wantsOffers?: boolean; tag?: CustomerTag },
  ): Promise<{
    items: LoyaltyCustomerSummary[];
    totalCount: number;
    countsByTag?: Record<string, number>;
  }>;
  ownerGetLoyaltyCustomer(venueId: string, customerId: string): Promise<LoyaltyCustomerDetail>;
  /** Act 843 erasure: their card, stamps and consent go; paid orders stay without name or phone. */
  ownerRemoveLoyaltyCustomer(venueId: string, customerId: string): Promise<void>;
  ownerStampLoyaltyCustomer(
    venueId: string,
    customerId: string,
    call?: Call,
  ): Promise<LoyaltyScanResult>;
  ownerListLoyaltyScans(venueId: string, since?: string): Promise<{ items: LoyaltyScanLogEntry[] }>;
  ownerScanLoyaltyCard(
    venueId: string,
    body: { qrPayload: string; action: 'stamp' | 'redeem' },
  ): Promise<LoyaltyScanResult>;
  ownerGetDashboard(venueId: string): Promise<OwnerDashboard>;
  ownerGetFloor(venueId: string): Promise<{ items: FloorTable[] }>;
  ownerListTransactions(venueId: string): Promise<{ items: VenueTransaction[] }>;
  ownerRefundTransaction(transactionId: string, call?: Call): Promise<VenueTransaction>;
  ownerListWrittenReviews(venueId: string): Promise<{ items: WrittenReview[] }>;
  ownerReplyToReview(reviewId: string, body: { text: string }, call?: Call): Promise<WrittenReview>;
  /** With range custom, pass the window too. */
  ownerGetInsights(
    venueId: string,
    range?: InsightsReport['range'],
    window?: { since: string; until: string },
  ): Promise<InsightsReport>;
  ownerRecordManualPayment(
    orderId: string,
    body: { method: ManualPaymentMethod },
    call?: Call,
  ): Promise<Order>;
  /** Owner only. The Paystack secret key is never returned, only `secretKeyHint`. */
  ownerGetPaymentSettings(venueId: string): Promise<PaymentSettings>;
  ownerSetManualPayments(venueId: string, body: ManualPayments): Promise<PaymentSettings>;
  /** Owner only. How much of Paystack's fee guests pay on in-app payments. */
  ownerSetFeePassing(venueId: string, body: FeePassing): Promise<PaymentSettings>;
  ownerConnectPaystack(venueId: string, body: PaystackKeysInput): Promise<PaymentSettings>;
  ownerDisconnectPaystack(venueId: string): Promise<PaymentSettings>;
  ownerTestPaystack(venueId: string): Promise<{ ok: boolean; checkedAt: string; message?: string }>;
  /** Real order figures; `since` (inclusive) and `until` (exclusive) are ISO times. */
  ownerGetSales(venueId: string, filter?: { since?: string; until?: string }): Promise<SalesReport>;
  ownerListFeedback(
    venueId: string,
    query?: { state?: 'all' | 'new' | 'archived'; search?: string },
  ): Promise<{ items: FeedbackItem[] }>;
  ownerArchiveFeedback(
    venueId: string,
    feedbackId: string,
    body: { archived: boolean },
  ): Promise<FeedbackItem>;
  ownerAskFeedbackAi(
    venueId: string,
    body: { question: string },
  ): Promise<{ reply: string; suggestions?: string[] }>;
  ownerListCustomLinks(venueId: string): Promise<{ items: CustomLink[] }>;
  ownerCreateCustomLink(venueId: string, body: CustomLinkInput): Promise<CustomLink>;
  ownerUpdateCustomLink(
    venueId: string,
    linkId: string,
    body: CustomLinkInput,
  ): Promise<CustomLink>;
  ownerDeleteCustomLink(venueId: string, linkId: string): Promise<void>;
  ownerGetBusiness(): Promise<{ business: Business; locations: Location[] }>;
  ownerUpdateBusiness(body: BusinessPatch): Promise<Business>;
  ownerCreateLocation(body: LocationInput): Promise<Location>;
  ownerUpdateLocation(locationId: string, body: LocationPatchInput): Promise<Location>;
  ownerListScannerDevices(venueId: string): Promise<{ items: ScannerDevice[] }>;
  ownerPairScannerDevice(
    venueId: string,
    body: { name: string; code?: string },
  ): Promise<ScannerDevice>;
  ownerRevokeScannerDevice(venueId: string, deviceId: string): Promise<void>;
  deleteAccount(body: { confirmText: string }): Promise<void>;
  ownerListPromos(venueId: string): Promise<{ items: Promo[] }>;
  ownerCreatePromo(venueId: string, body: PromoInput): Promise<Promo>;
  ownerUpdatePromo(venueId: string, promoId: string, body: PromoPatch): Promise<Promo>;
  ownerDeletePromo(venueId: string, promoId: string): Promise<void>;
  ownerListNotifications(
    venueId: string,
    query?: { kind?: OwnerNotificationKind; unread?: boolean },
  ): Promise<NotificationPage>;
  /** Leave ids out to mark everything read. */
  ownerMarkNotificationsRead(venueId: string, ids?: string[]): Promise<{ unreadCount: number }>;
  updateMyProfile(body: StaffProfilePatch): Promise<StaffUser>;
};

export type { Currency };
