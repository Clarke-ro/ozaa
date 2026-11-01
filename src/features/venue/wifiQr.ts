export type WifiSecurity = 'WPA' | 'WPA2' | 'WPA3' | 'WEP' | 'nopass' | 'OPEN';

export interface WifiConfig {
  ssid: string;
  password?: string;
  security?: WifiSecurity;
  hidden?: boolean;
}

/**
 * Formats a standard Wi-Fi QR code string:
 * WIFI:T:WPA;S:MyNetwork;P:MyPassword;H:false;;
 */
export function formatWifiQrString(config: WifiConfig): string {
  const ssid = (config.ssid ?? '').replace(/([\\;,:"])/g, '\\$1');
  const password = (config.password ?? '').replace(/([\\;,:"])/g, '\\$1');
  let security = config.security ?? 'WPA';
  if (security === 'OPEN') security = 'nopass';
  const hidden = config.hidden ? 'true' : 'false';

  return `WIFI:T:${security};S:${ssid};P:${password};H:${hidden};;`;
}
