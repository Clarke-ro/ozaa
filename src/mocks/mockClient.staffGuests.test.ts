import { ApiError } from '@/lib/api/errors';
import { signedInMock } from './testOwner';

async function setup() {
  const { api } = await signedInMock();
  const venue = await api.getVenue('mamas-kitchen');
  const staff = (await api.ownerListStaff(venue.id)).items;
  return { api, venueId: venue.id, staff };
}

describe('staff changes', () => {
  it('changes a role and the tables someone looks after', async () => {
    const { api, venueId, staff } = await setup();
    const waiter = staff.find((s) => s.role === 'waiter')!;
    const saved = await api.ownerUpdateStaff(venueId, waiter.id, {
      role: 'manager',
      tableCodes: ['3', '4'],
    });
    expect(saved.role).toBe('manager');
    expect(saved.tableCodes).toEqual(['3', '4']);
  });

  it("refuses to change the owner's role", async () => {
    const { api, venueId, staff } = await setup();
    const owner = staff.find((s) => s.role === 'owner')!;
    await expect(api.ownerUpdateStaff(venueId, owner.id, { role: 'waiter' })).rejects.toMatchObject(
      {
        status: 409,
      },
    );
  });

  it('ends a shift and clears a PIN', async () => {
    const { api, venueId, staff } = await setup();
    const waiter = staff.find((s) => s.role === 'waiter')!;
    await api.ownerSignOutStaff(venueId, waiter.id);
    await api.ownerResetStaffPin(venueId, waiter.id);
    const after = (await api.ownerListStaff(venueId)).items.find((s) => s.id === waiter.id)!;
    expect(after.onShift).toBe(false);
    expect(after.hasPin).toBe(false);
  });
});

describe('removing a loyalty member', () => {
  it('takes them off the list (Act 843 erasure)', async () => {
    const { api, venueId } = await setup();
    const before = (await api.ownerListLoyaltyCustomers(venueId, {})).items;
    const member = before[0]!;
    await api.ownerRemoveLoyaltyCustomer(venueId, member.id);
    const after = (await api.ownerListLoyaltyCustomers(venueId, {})).items;
    expect(after.map((m) => m.id)).not.toContain(member.id);
    await expect(api.ownerGetLoyaltyCustomer(venueId, member.id)).rejects.toBeInstanceOf(ApiError);
  });
});
