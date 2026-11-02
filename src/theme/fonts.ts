import { Platform } from 'react-native';
import { FontDisplay, useFonts, type FontSource } from 'expo-font';
import Inter400 from '../../assets/fonts/Inter-400.woff2';
import Inter600 from '../../assets/fonts/Inter-600.woff2';
import Montserrat800 from '../../assets/fonts/Montserrat-800.woff2';
import NotoSerif700 from '../../assets/fonts/NotoSerif-700.woff2';
import Unbounded700 from '../../assets/fonts/Unbounded-700.woff2';

const web = Platform.OS === 'web';

// On the web each font swaps in when it arrives (BUILD.md section 11, Fonts), so the page can
// show in the system font straight away instead of waiting for five files on slow data.
const font = (file: number): FontSource => (web ? { uri: file, display: FontDisplay.SWAP } : file);

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    Inter_400: font(Inter400),
    Inter_600: font(Inter600),
    Unbounded_700: font(Unbounded700),
    NotoSerif_700: font(NotoSerif700),
    Montserrat_800: font(Montserrat800),
  });
  // The web never waits (fonts swap in). Native waits behind the splash screen.
  // Expo Go cannot use WOFF2, and waiting forever leaves a blank screen, so an error counts as done.
  return web || loaded || error != null;
}
