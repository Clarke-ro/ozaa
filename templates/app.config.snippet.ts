// app.config.ts: the icon and splash part. Copy design/logo/expo/* to assets/images/ first.
// Check the field names against the docs for the installed SDK (docs.expo.dev/versions/v58.0.0/config/app/).
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Cravins',
  slug: 'cravins',
  scheme: 'cravins',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  // app.cravins.* bundle ids are placeholders until Clarke owns cravins.app. Change them before the first store build.
  ios: { supportsTablet: false, bundleIdentifier: 'app.cravins.owner' },
  android: {
    package: 'app.cravins.owner',
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
    ['expo-splash-screen', { image: './assets/images/splash-icon.png', imageWidth: 200, backgroundColor: '#FFFFFF' }],
    'expo-font',
    'expo-secure-store',
    ['expo-camera', { cameraPermission: 'Cravins uses the camera to record your video review.', microphonePermission: 'Cravins records sound with your video review.' }],
  ],
  experiments: { typedRoutes: true },
};

export default config;
