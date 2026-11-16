import type { ExpoConfig } from 'expo/config';
import tokens from './design/tokens.json';

const BRAND = tokens.color.brand.hex;
const WHITE = tokens.color.white.hex;

// Bundle ids are placeholders until Clarke owns a domain. Change them before the first store build.
const config: ExpoConfig = {
  name: 'Cravins',
  slug: 'cravins',
  scheme: 'cravins',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: false, bundleIdentifier: 'app.cravins.owner' },
  android: {
    package: 'app.cravins.owner',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon-foreground.png',
      backgroundImage: './assets/images/adaptive-icon-background.png',
      monochromeImage: './assets/images/adaptive-icon-monochrome.png',
      backgroundColor: BRAND,
    },
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
    bundler: 'metro',
    // Guest pages are white, so the phone's browser bar is too (matches public/manifest.json).
    themeColor: WHITE,
    // Search engines and link previews show this under the title (Clarke, 2026-11-11).
    description: 'Order and pay from your table.',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { image: './assets/images/splash-icon.png', imageWidth: 200, backgroundColor: WHITE },
    ],
    'expo-font',
    'expo-secure-store',
    'expo-localization',
    'expo-image',
    'expo-video',
    'expo-web-browser',
    'expo-asset',
    [
      'expo-camera',
      {
        // The camera scans loyalty cards (owner app) and records video reviews (guests); the store
        // review checks this text matches every use.
        cameraPermission:
          'Cravins uses the camera to scan loyalty cards and to record your video review.',
        microphonePermission: 'Cravins records sound with your video review.',
      },
    ],
    [
      'expo-location',
      {
        // Only while the app is open, and only when someone taps "Use my location". Never in the background.
        locationWhenInUsePermission:
          'Cravins uses your location to work out delivery to you, or to put your venue on the map.',
        locationAlwaysAndWhenInUsePermission: false,
        locationAlwaysPermission: false,
      },
    ],
  ],
  experiments: { typedRoutes: true, chunking: { mode: 'granular' } },
  extra: {
    router: { origin: false },
    // Roadmap previews (Stock, AI waiter, Marketing, Register) run on sample data. Off unless
    // PREVIEWS_ENABLED=true, so a real venue never sees made-up numbers.
    previewsEnabled: process.env.PREVIEWS_ENABLED === 'true',
  },
};

export default config;
