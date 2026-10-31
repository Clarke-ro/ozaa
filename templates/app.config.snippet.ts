// app.config.ts: the icon and splash part. Copy design/logo/expo/* to assets/images/ first.
// Check the field names against the docs for the installed SDK (docs.expo.dev/versions/v58.0.0/config/app/).
import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Ozaa',
  slug: 'ozaa',
  scheme: 'ozaa',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'light',
  // app.ozaa.* bundle ids are placeholders until Clarke owns ozaa.app. Change them before the first store build.
  ios: { supportsTablet: false, bundleIdentifier: 'app.ozaa.owner' },
  android: {
    package: 'app.ozaa.owner',
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
    ['expo-camera', { cameraPermission: 'Ozaa uses the camera to record your video review.', microphonePermission: 'Ozaa records sound with your video review.' }],
  ],
  experiments: { typedRoutes: true },
};

export default config;
