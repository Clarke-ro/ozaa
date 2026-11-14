import { signedInMock } from './testOwner';

describe('moving the location pin', () => {
  it('saves the pin and moves the delivery pin with it', async () => {
    const { api } = await signedInMock();
    const before = await api.ownerGetBusiness();
    const osu = before.locations.find((l) => l.name.startsWith("Mama's"))!;
    const pin = { lat: 5.5571, lng: -0.1845 };
    await api.ownerUpdateLocation(osu.id, { geo: pin });

    const after = await api.ownerGetBusiness();
    expect(after.locations.find((l) => l.id === osu.id)?.geo).toEqual(pin);
    // Delivery fees measure from the venue's own pin, so it has to follow.
    const venue = await api.getVenue('mamas-kitchen');
    expect(venue.location.lat).toBe(pin.lat);
    expect(venue.location.lng).toBe(pin.lng);
  });
});
