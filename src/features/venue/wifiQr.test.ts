import { formatWifiQrString } from './wifiQr';

describe('formatWifiQrString', () => {
  test('formats standard WPA2 protected network', () => {
    const qr = formatWifiQrString({
      ssid: 'MamaKitchenGuest',
      password: 'jollofpower2026',
      security: 'WPA2',
    });
    expect(qr).toBe('WIFI:T:WPA2;S:MamaKitchenGuest;P:jollofpower2026;H:false;;');
  });

  test('formats open network without password', () => {
    const qr = formatWifiQrString({
      ssid: 'AccraMallFree',
      security: 'nopass',
    });
    expect(qr).toBe('WIFI:T:nopass;S:AccraMallFree;P:;H:false;;');
  });

  test('formats hidden network', () => {
    const qr = formatWifiQrString({
      ssid: 'BackOffice',
      password: 'secret',
      security: 'WPA3',
      hidden: true,
    });
    expect(qr).toBe('WIFI:T:WPA3;S:BackOffice;P:secret;H:true;;');
  });

  test('escapes special characters in SSID and password', () => {
    const qr = formatWifiQrString({
      ssid: 'Cafe;Special:1',
      password: 'p\\ass;word',
      security: 'WPA',
    });
    expect(qr).toBe('WIFI:T:WPA;S:Cafe\\;Special\\:1;P:p\\\\ass\\;word;H:false;;');
  });
});
