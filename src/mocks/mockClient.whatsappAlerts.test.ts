import { ownerApi } from './testOwner';

// The alerts number is the owner's own business line. Like the TIN, it must never reach guests.
describe('WhatsApp order alerts number', () => {
  it('starts empty, saves, and turns off with null', async () => {
    const api = await ownerApi();
    const venue = await api.getVenue('mamas-kitchen');
    expect((await api.ownerGetVenue(venue.id)).whatsappAlerts ?? null).toBeNull();

    await api.ownerUpdateVenue(venue.id, { whatsappAlerts: '+233241234567' });
    expect((await api.ownerGetVenue(venue.id)).whatsappAlerts).toBe('+233241234567');

    await api.ownerUpdateVenue(venue.id, { whatsappAlerts: null });
    expect((await api.ownerGetVenue(venue.id)).whatsappAlerts ?? null).toBeNull();
  });

  it('is never on the public venue a guest reads', async () => {
    const api = await ownerApi();
    const venue = await api.getVenue('mamas-kitchen');
    await api.ownerUpdateVenue(venue.id, { whatsappAlerts: '+233241234567' });
    expect(JSON.stringify(await api.getVenue('mamas-kitchen'))).not.toContain('+233241234567');
  });

  it('leaves the other venue settings alone', async () => {
    const api = await ownerApi();
    const venue = await api.getVenue('mamas-kitchen');
    const before = await api.ownerGetVenue(venue.id);
    await api.ownerUpdateVenue(venue.id, { whatsappAlerts: '+233241234567' });
    const after = await api.ownerGetVenue(venue.id);
    expect(after.name).toBe(before.name);
    expect(after.whatsapp).toBe(before.whatsapp);
  });
});
