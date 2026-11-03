import type { ExpoConfig } from 'expo/config';

// Bundle ids are placeholders until Clarke owns a domain. Change them before the first store build.
const config: ExpoConfig = {
  name: 'Ozaa',
  slug: 'ozaa',
  scheme: 'ozaa',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: false, bundleIdentifier: 'app.ozaa.owner' },
  android: {
    package: 'app.ozaa.owner',
    predictiveBackGestureEnabled: false,
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon-foreground.png',
      backgroundImage: './assets/images/adaptive-icon-background.png',
      monochromeImage: './assets/images/adaptive-icon-monochrome.png',
      backgroundColor: '#FC5205',
    },
  },
  web: { output: 'single', favicon: './assets/images/favicon.png', bundler: 'metro' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      { image: './assets/images/splash-icon.png', imageWidth: 200, backgroundColor: '#FFFFFF' },
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
        cameraPermission: 'Ozaa uses the camera to record your video review.',
        microphonePermission: 'Ozaa records sound with your video review.',
      },
    ],
  ],
  experiments: { typedRoutes: true, chunking: { mode: 'granular' } },
  extra: {
    router: { origin: false },
    // Payments are off in this build (docs/payments-removed.md). Start with PAYMENTS_ENABLED=true to show them.
    paymentsEnabled: process.env.PAYMENTS_ENABLED === 'true',
    // Roadmap previews (Stock, AI waiter, Marketing, Register) run on sample data. Off unless
    // PREVIEWS_ENABLED=true, so a real venue never sees made-up numbers.
    previewsEnabled: process.env.PREVIEWS_ENABLED === 'true',
  },
};

export default config;
