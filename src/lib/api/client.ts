import type {
  AuthTokens,
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
  MenuCategory,
  MenuCategoryInput,
  MenuItem,
  MenuItemInput,
  Offer,
  Order,
  OtpPurpose,
  OwnerDashboard,
  Payment,
  PayoutAccount,
  PayoutAccountInput,
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
} from './types';

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
  verifyOtp(body: { phone: string; code: string; purpose: OtpPurpose }): Promise<AuthTokens>;
  refreshTokens(body: { refreshToken: string }): Promise<AuthTokens>;
  logout(): Promise<void>;
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
  paystackWebhook(rawBody: string, signature: string | null): Promise<void>;
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
    body: { phone: string; role: StaffRole; firstName: string },
  ): Promise<StaffMember>;
  ownerRevokeStaff(venueId: string, staffId: string): Promise<void>;
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
  ownerListOrders(venueId: string): Promise<{ items: Order[]; nextCursor?: string | null }>;
  ownerSetOrderStatus(orderId: string, body: { status: Order['status'] }): Promise<Order>;
  ownerRecordCashPayment(
    orderId: string,
    body: { amountPesewas: number },
    call?: Call,
  ): Promise<Order>;
  ownerListWaiterCalls(venueId: string): Promise<{ items: WaiterCall[] }>;
  ownerUpdateWaiterCall(
    id: string,
    body: { status: 'acknowledged' | 'resolved' },
  ): Promise<WaiterCall>;
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
    query?: { search?: string; wantsOffers?: boolean },
  ): Promise<{ items: LoyaltyCustomerSummary[]; totalCount: number }>;
  ownerScanLoyaltyCard(
    venueId: string,
    body: { qrPayload: string; action: 'stamp' | 'redeem' },
  ): Promise<LoyaltyScanResult>;
  ownerGetPayoutAccount(venueId: string): Promise<PayoutAccount>;
  ownerSetPayoutAccount(venueId: string, body: PayoutAccountInput): Promise<PayoutAccount>;
  ownerGetDashboard(venueId: string): Promise<OwnerDashboard>;
  ownerGetFloor(venueId: string): Promise<{ items: FloorTable[] }>;
  ownerListTransactions(venueId: string): Promise<{ items: VenueTransaction[] }>;
  ownerRefundTransaction(transactionId: string, call?: Call): Promise<VenueTransaction>;
  ownerListWrittenReviews(venueId: string): Promise<{ items: WrittenReview[] }>;
  ownerReplyToReview(reviewId: string, body: { text: string }, call?: Call): Promise<WrittenReview>;
  ownerGetInsights(venueId: string, range?: InsightsReport['range']): Promise<InsightsReport>;
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
  ownerUpdateBusiness(body: { name: string }): Promise<Business>;
  ownerCreateLocation(body: LocationInput): Promise<Location>;
  ownerUpdateLocation(locationId: string, body: LocationPatchInput): Promise<Location>;
  ownerListScannerDevices(venueId: string): Promise<{ items: ScannerDevice[] }>;
  ownerPairScannerDevice(
    venueId: string,
    body: { name: string; code?: string },
  ): Promise<ScannerDevice>;
  ownerRevokeScannerDevice(venueId: string, deviceId: string): Promise<void>;
  deleteAccount(body: { confirmText: string }): Promise<void>;
};

export type { Currency };
