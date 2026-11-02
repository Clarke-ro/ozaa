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
  experiments: { typedRoutes: true },
  extra: { router: { origin: false } },
};

export default config;
