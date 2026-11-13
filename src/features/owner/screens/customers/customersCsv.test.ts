import { customersCsv } from './customersCsv';

const base = {
  id: 'c1',
  name: 'Kofi Mensah',
  phoneMasked: '024 *** 4567',
  email: null,
  stamps: 8,
  rewardsAvailable: 1,
  wantsOffers: true,
  lastStampAt: '2026-11-09T10:00:00Z',
};

describe('customersCsv', () => {
  it('starts with a header row, then one row per customer', () => {
    const lines = customersCsv([base]).split('\n');
    expect(lines[0]).toBe('Phone,Name,Visits,Stamps,Rewards Available,Marketing Opt-In,Last Visit,Tags');
    expect(lines[1]).toBe('"024 *** 4567","Kofi Mensah",0,8,1,YES,"2026-11-09T10:00:00Z",""');
  });

  it('doubles quotes inside a name so the file still opens', () => {
    const row = customersCsv([{ ...base, name: 'Ama "Mama" Owusu' }]).split('\n')[1];
    expect(row).toContain('"Ama ""Mama"" Owusu"');
  });

  it('says NO for a customer who did not agree to offers', () => {
    expect(customersCsv([{ ...base, wantsOffers: false }])).toContain(',NO,');
  });
});
