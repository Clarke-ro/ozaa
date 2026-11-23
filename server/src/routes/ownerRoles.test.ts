import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StaffRole } from '../shared/types.ts';
import { gridSetup, ownerOperations, ROLE_ORDER } from './ownerGridSetup.ts';

// BUILD.md 5.2: every owner call × every staff role, and every owner call from another venue.
// The contract says: owner everything; manager everything except payment settings and staff;
// waiter orders and waiter calls; kitchen order status. The app's menu (owner/chrome/nav.ts)
// fills in the rest. Who may do what is written out here on purpose, so changing it is a
// visible edit to this table, not a side effect.

const OWNER: StaffRole[] = ['owner'];
const DESK: StaffRole[] = ['owner', 'manager'];
const FRONT: StaffRole[] = ['owner', 'manager', 'waiter'];
const MOVE: StaffRole[] = ['owner', 'manager', 'waiter', 'kitchen'];
const READ_ROOM: StaffRole[] = ['owner', 'manager', 'waiter', 'kitchen', 'viewer'];
const LOYALTY_DESK: StaffRole[] = ['owner', 'manager', 'waiter', 'staff_scanner'];
const EVERYONE: StaffRole[] = [...ROLE_ORDER];

const ALLOWED: Record<string, StaffRole[]> = {
  // Your own account: everyone signed in.
  getMe: EVERYONE,
  updateMyProfile: EVERYONE,
  setStaffPin: EVERYONE,
  deleteAccount: EVERYONE,
  ownerListNotifications: EVERYONE,
  ownerMarkNotificationsRead: EVERYONE,
  ownerGetBusiness: EVERYONE,
  // The venue and its page.
  ownerGetVenue: READ_ROOM,
  ownerGetServices: READ_ROOM,
  ownerUpdateVenue: DESK,
  ownerSetTheme: DESK,
  ownerCreateMediaUpload: DESK,
  ownerSetServices: DESK,
  // Menu, tables and links.
  ownerListCategories: DESK,
  ownerCreateCategory: DESK,
  ownerUpdateCategory: DESK,
  ownerDeleteCategory: DESK,
  ownerCreateItem: DESK,
  ownerUpdateItem: DESK,
  ownerDeleteItem: DESK,
  ownerListTables: READ_ROOM,
  ownerCreateTables: DESK,
  ownerGetTableQr: DESK,
  ownerListCustomLinks: DESK,
  ownerCreateCustomLink: DESK,
  ownerUpdateCustomLink: DESK,
  ownerDeleteCustomLink: DESK,
  // Running the room.
  ownerListOrders: READ_ROOM,
  ownerGetOrder: READ_ROOM,
  ownerCreateOrder: FRONT,
  ownerSetOrderStatus: MOVE,
  ownerRecordManualPayment: FRONT,
  ownerListWaiterCalls: READ_ROOM,
  ownerUpdateWaiterCall: FRONT,
  ownerGetDashboard: READ_ROOM,
  ownerGetFloor: READ_ROOM,
  // Money: payment settings and the ledger are the owner's alone.
  ownerGetPaymentSettings: OWNER,
  ownerSetManualPayments: OWNER,
  ownerSetFeePassing: OWNER,
  ownerConnectPaystack: OWNER,
  ownerDisconnectPaystack: OWNER,
  ownerTestPaystack: OWNER,
  ownerListTransactions: OWNER,
  ownerGetInsights: DESK,
  ownerGetSales: DESK,
  // Guests: loyalty set-up for the desk, the counter for front staff and scanners.
  ownerGetLoyalty: READ_ROOM,
  ownerSetLoyalty: DESK,
  ownerListLoyaltyMembers: DESK,
  ownerGetLoyaltyAnalytics: DESK,
  ownerConfirmRedemption: LOYALTY_DESK,
  ownerScanLoyaltyCard: LOYALTY_DESK,
  ownerListLoyaltyCustomers: LOYALTY_DESK,
  ownerGetLoyaltyCustomer: LOYALTY_DESK,
  ownerStampLoyaltyCustomer: LOYALTY_DESK,
  ownerListLoyaltyScans: LOYALTY_DESK,
  ownerRemoveLoyaltyCustomer: OWNER,
  ownerListWrittenReviews: DESK,
  ownerReplyToReview: DESK,
  ownerListFeedback: DESK,
  ownerArchiveFeedback: DESK,
  ownerAskFeedbackAi: DESK,
  ownerListPromos: READ_ROOM,
  ownerCreatePromo: DESK,
  ownerUpdatePromo: DESK,
  ownerDeletePromo: DESK,
  // The business, its people and its devices.
  ownerUpdateBusiness: OWNER,
  ownerCreateLocation: OWNER,
  ownerUpdateLocation: OWNER,
  ownerListStaff: OWNER,
  ownerInviteStaff: OWNER,
  ownerUpdateStaff: OWNER,
  ownerRevokeStaff: OWNER,
  ownerResetStaffPin: OWNER,
  ownerSignOutStaff: OWNER,
  ownerListScannerDevices: DESK,
  ownerPairScannerDevice: DESK,
  ownerRevokeScannerDevice: DESK,
};

// Left out of the grid, each for a reason.
const NOT_IN_GRID: Record<string, string> = {
  ownerRefundTransaction: 'always 404: venues refund in their own Paystack dashboard',
};

// Calls about the caller's own account or business, which another venue's owner may make.
const OWN_SCOPE = new Set([
  'getMe',
  'updateMyProfile',
  'setStaffPin',
  'deleteAccount',
  'ownerGetBusiness',
  'ownerUpdateBusiness',
  'ownerCreateLocation',
]);

const bodyFor = (method: string) => (method === 'GET' || method === 'DELETE' ? undefined : {});

test('every owner call in the contract has a row in the role table', () => {
  const missing = ownerOperations()
    .map((op) => op.operationId)
    .filter((id) => !(id in ALLOWED) && !(id in NOT_IN_GRID));
  assert.deepEqual(missing, [], 'add each new owner call to ALLOWED in ownerRoles.test.ts');
});

test('every owner call × every role: refused with 403 exactly when the role may not', async () => {
  const { call, pathFor, people } = await gridSetup();
  const wrong: string[] = [];
  for (const op of ownerOperations()) {
    const allowed = ALLOWED[op.operationId];
    if (!allowed) continue;
    // Least able first: a delete by an allowed role can't then hide a missing check for a weaker one.
    for (const role of ROLE_ORDER) {
      const { status } = await call(op.method, pathFor(op.path), bodyFor(op.method), people[role]);
      const may = allowed.includes(role);
      // Allowed roles get past the check: anything but 401/403, and never a server error.
      if (may ? status === 401 || status === 403 || status >= 500 : status !== 403) {
        wrong.push(
          `${op.operationId} as ${role}: ${status} (${may ? 'should be allowed' : 'should be 403'})`,
        );
      }
    }
  }
  assert.deepEqual(wrong, []);
});

test("another venue's owner gets nothing from Mama's Kitchen, on any owner call", async () => {
  const { call, pathFor, stranger } = await gridSetup();
  const leaked: string[] = [];
  for (const op of ownerOperations()) {
    if (OWN_SCOPE.has(op.operationId) || op.operationId in NOT_IN_GRID) continue;
    const { status } = await call(op.method, pathFor(op.path), bodyFor(op.method), stranger);
    if (status !== 403 && status !== 404) leaked.push(`${op.operationId}: ${status}`);
  }
  assert.deepEqual(leaked, []);
});
